import axios, { AxiosError } from 'axios';
import { QueuesResponse, QueuesResponseSchema, QueueJobsResponse, QueueJobsResponseSchema } from './types';
import { toast } from 'sonner';

import { Observable, Subject, from, of, timer, concat, throwError, EMPTY } from 'rxjs';
import { mergeMap, concatMap, tap, catchError, delay, map, share, finalize, expand, takeWhile, scan } from 'rxjs/operators';

// RxJS-based rate limiter for API requests
class RxRateLimiter {
  private queue$ = new Subject<{
    fn: () => Promise<any>,
    observer: { next: (value: any) => void, error: (err: any) => void, complete: () => void }
  }>();
  private lastRequestTime = 0;
  private processing = false;
  
  constructor(private minInterval = 1000) {
    // Process queue items with rate limiting
    this.queue$.pipe(
      concatMap(item => {
        const now = Date.now();
        const timeElapsed = now - this.lastRequestTime;
        const waitTime = Math.max(0, this.minInterval - timeElapsed);
        
        return concat(
          // Wait if needed
          waitTime > 0 ? timer(waitTime) : of(null),
          // Execute the function
          from(item.fn()).pipe(
            tap(() => this.lastRequestTime = Date.now()),
            map(result => ({ result, observer: item.observer, error: null })),
            catchError(error => of({ result: null, observer: item.observer, error }))
          )
        );
      })
    ).subscribe(
      (item) => {
        if (!item || !item.observer) {
          return;
        }
        
        if (item.error) {
          try {
            item.observer.error(item.error);
          } catch (err) {
            // Observer might be closed, ignore
          }
        } else {
          try {
            item.observer.next(item.result);
            item.observer.complete();
          } catch (err) {
            // Observer might be closed, ignore
          }
        }
      }
    );
  }
  
  throttle<T>(fn: () => Promise<T>): Observable<T> {
    return new Observable<T>(observer => {
      if (!observer) {
        return;
      }
      
      this.queue$.next({
        fn,
        observer: {
          next: (value) => {
            try {
              observer.next(value);
            } catch (err) {
              // Observer might be closed, ignore
            }
          },
          error: (err) => {
            try {
              observer.error(err);
            } catch (error) {
              // Observer might be closed, ignore
            }
          },
          complete: () => {
            try {
              observer.complete();
            } catch (err) {
              // Observer might be closed, ignore
            }
          }
        }
      });
      
      // Return unsubscribe function
      return () => {
        // Nothing to clean up for this specific request
      };
    }).pipe(
      share()
    );
  }
}

// Create a singleton instance
const rateLimiter = new RxRateLimiter(1000);

// Create a custom axios instance with retries
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  validateStatus: (status) => {
    return status >= 200 && status < 300;
  },
});

// Add request interceptor for logging and retry handling
api.interceptors.request.use(
  (config) => {
    // Add retry count to config if not present
    if (config.retryCount === undefined) {
      config.retryCount = 0;
      config.maxRetries = 3;
    }

    // Reduce the batch size for large requests
    if (config.params?.jobsPerPage && config.params.jobsPerPage > 20) {
      config.params.jobsPerPage = 20;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for logging and retry handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Only retry on network errors or 5xx errors
    if (
      (error.code === 'ECONNABORTED' || 
       error.code === 'ETIMEDOUT' ||
       error.code === 'ECONNRESET' ||
       (error.response && error.response.status >= 500)) && 
      config.retryCount < config.maxRetries
    ) {
      config.retryCount++;

      // Exponential backoff with jitter
      const jitter = Math.random() * 1000;
      const backoffDelay = Math.min(1000 * (2 ** config.retryCount) + jitter, 10000);
      
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      return api(config);
    }

    return Promise.reject(error);
  }
);

export function fetchQueueJobs(
  queueName: string, 
  status = 'latest',
  page = 1,
  jobsPerPage = 20,
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<QueueJobsResponse> {
  
  // Create an observable for the API request
  return new Promise((resolve, reject) => {
    try {
      const subscription = rateLimiter.throttle(() => api.get<QueuesResponse>('/queues', {
        params: {
          activeQueue: queueName,
          status,
          page,
          jobsPerPage,
          sortOrder,
          includeJobs: true,
          includeDelayed: true,
          includePaused: true,
          includeWaiting: true,
          includeActive: true,
          includeCompleted: true,
          includeFailed: true,
          showEmpty: true
        },
      }))
      .pipe(
        map(response => {
          try {
            // Validate the response
            const parsed = QueuesResponseSchema.safeParse(response.data);
            if (!parsed.success) {
              throw new Error(`Ogiltig data från servern: ${parsed.error.message}`);
            }

            // Find the requested queue
            const queue = parsed.data.queues.find(q => q.name === queueName);
            if (!queue) {
              // Return empty queue instead of throwing
              return { 
                queue: { 
                  jobs: [], 
                  counts: { active: 0, waiting: 0, completed: 0, failed: 0, delayed: 0, paused: false } 
                } 
              };
            }

            return { queue };
          } catch (error) {
            // Return empty queue instead of throwing
            return { 
              queue: { 
                jobs: [], 
                counts: { active: 0, waiting: 0, completed: 0, failed: 0, delayed: 0, paused: false } 
              } 
            };
          }
        }),
        catchError(error => {
          try {
            const handledError = handleApiError(error, queueName);
            return throwError(() => handledError);
          } catch (handledError) {
            return throwError(() => handledError);
          }
        }),
        finalize(() => {
        })
      ).subscribe({
        next: (result) => {
          resolve(result);
        },
        error: (error) => {
          reject(error);
        },
        complete: () => {
        }
      });
      
      // Return cleanup function
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      reject(error);
    }
  });
}

// VIKTIGT: Använd endast reaktiva RxJS-metoder. Statiska objekt, globala variabler 
// och blockerande metoder som toArray() är FÖRBJUDNA.

// Load all historical jobs for a queue using pagination
export function fetchAllHistoricalJobs(
  queueName: string,
  jobsPerPage = 50
): Observable<QueueJobsResponse> {
  
  // Skapa en initial tom respons
  const emptyResponse: QueueJobsResponse = { 
    queue: { 
      jobs: [], 
      counts: { active: 0, waiting: 0, completed: 0, failed: 0, delayed: 0, paused: false } 
    } 
  };
  
  // Använd en rekursiv funktion för att hämta alla sidor reaktivt
  // Implementera med scan för att emittera delresultat för varje sida
  const fetchPages = (): Observable<QueueJobsResponse> => {
    return from([1]) // Starta med sida 1
      .pipe(
        // Expandera strömmen för att hämta alla sidor
        expand(page => 
          from(fetchQueueJobs(queueName, 'latest', page, jobsPerPage, 'asc')).pipe(
            map(response => {
              return {
                response: response || emptyResponse,
                nextPage: response?.queue?.jobs?.length === jobsPerPage ? page + 1 : null
              };
            }),
            catchError(error => {
              return of({ response: emptyResponse, nextPage: null });
            })
          )
        ),
        // Avsluta när vi inte har fler sidor
        takeWhile(({ nextPage }) => nextPage !== null, true),
        // Ackumulera resultat med scan
        scan((acc, { response }) => {
          if (!acc.queue?.jobs?.length) return response || emptyResponse;
          
          if (!response?.queue) {
            return acc;
          }
          
          return {
            queue: {
              ...response.queue,
              jobs: [...acc.queue.jobs, ...(response.queue.jobs || [])]
            }
          };
        }, emptyResponse),
      );
  };
  // Starta hämtningen av alla sidor
  return fetchPages().pipe(
    // Slutlig loggning när alla sidor är hämtade
    finalize(() => {}),
    // Dela strömmen för att undvika att köra om hela pipeline för varje subscriber
    share()
  );
}

function handleApiError(error: unknown, context?: string): Error {
  const errorPrefix = context ? `[${context}] ` : '';

  if (error instanceof AxiosError) {
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return new Error(`${errorPrefix}Servern svarar långsamt`);
      }
      if (error.code === 'ECONNRESET') {
        return new Error(`${errorPrefix}Anslutningen bröts`);
      }
      if (error.code === 'ERR_NETWORK') {
        return new Error(`${errorPrefix}Kunde inte nå servern. Kontrollera din internetanslutning.`);
      }
      return new Error(`${errorPrefix}Kunde inte nå servern: ${error.message}`);
    }
    
    const statusCode = error.response.status;
    const responseData = error.response.data;
    
    switch (statusCode) {
      case 401:
        return new Error(`${errorPrefix}Du måste logga in`);
      case 403:
        return new Error(`${errorPrefix}Åtkomst nekad`);
      case 404:
        return new Error(`${errorPrefix}Kunde inte hitta data`);
      case 429:
        return new Error(`${errorPrefix}För många förfrågningar`);
      case 500:
      case 502:
      case 503:
      case 504:
        return new Error(`${errorPrefix}Ett serverfel har inträffat (${statusCode})`);
      default:
        // Include response data in error message if available
        const errorMessage = responseData?.message || responseData?.error || error.message;
        return new Error(`${errorPrefix}Ett fel uppstod (${statusCode}): ${errorMessage}`);
    }
  }
  
  // For non-Axios errors, try to extract useful information
  const errorMessage = error instanceof Error ? error.message : String(error);
  return new Error(`${errorPrefix}Ett oväntat fel uppstod: ${errorMessage}`);
}
