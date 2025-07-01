import { Observable, throwError, timer, of } from 'rxjs';
import { mergeMap, retryWhen, tap, catchError, finalize } from 'rxjs/operators';
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { toast } from 'sonner';

// Create a reactive wrapper around axios
export class RxHttpClient {
  constructor(private baseConfig: AxiosRequestConfig = {}) {}

  get<T>(url: string, config: AxiosRequestConfig = {}): Observable<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  post<T>(url: string, data?: any, config: AxiosRequestConfig = {}): Observable<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  put<T>(url: string, data?: any, config: AxiosRequestConfig = {}): Observable<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  delete<T>(url: string, config: AxiosRequestConfig = {}): Observable<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  private request<T>(config: AxiosRequestConfig): Observable<AxiosResponse<T>> {
    const mergedConfig = { ...this.baseConfig, ...config };
    
    return new Observable<AxiosResponse<T>>(observer => {
      const source = axios.CancelToken.source();
      
      axios({ ...mergedConfig, cancelToken: source.token })
        .then(response => {
          observer.next(response);
          observer.complete();
        })
        .catch(error => {
          if (axios.isCancel(error)) {
            // Request was cancelled
            observer.complete();
          } else {
            observer.error(error);
          }
        });
      
      // Return cleanup function
      return () => {
        source.cancel('Operation cancelled by unsubscribe');
      };
    }).pipe(
      // Add retry with exponential backoff
      retryWhen(errors => 
        errors.pipe(
          mergeMap((error, i) => {
            const retryAttempt = i + 1;
            
            // Only retry on network errors or 5xx errors
            if (
              (error.code === 'ECONNABORTED' || 
               error.code === 'ETIMEDOUT' ||
               error.code === 'ECONNRESET' ||
               (error.response && error.response.status >= 500)) && 
              retryAttempt <= 3
            ) {
              // Exponential backoff with jitter
              const jitter = Math.random() * 1000;
              const delay = Math.min(1000 * (2 ** retryAttempt) + jitter, 10000);
              
              return timer(delay);
            }
            
            return throwError(() => error);
          })
        )
      ),
      catchError(error => {
        return throwError(() => error);
      }),
      finalize(() => {
      })
    );
  }
}

// Create a singleton instance
export const rxHttp = new RxHttpClient({
  baseURL: '/api',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Connection': 'keep-alive',
  },
  timeout: 30000,
});

// Helper function to handle API errors in a reactive way
export function handleApiErrorRx(error: any, context?: string): Observable<never> {
  const errorPrefix = context ? `[${context}] ` : '';

  let errorMessage: string;

  if (error instanceof AxiosError) {
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage = `${errorPrefix}Servern svarar långsamt`;
      } else if (error.code === 'ECONNRESET') {
        errorMessage = `${errorPrefix}Anslutningen bröts`;
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = `${errorPrefix}Kunde inte nå servern. Kontrollera din internetanslutning.`;
      } else {
        errorMessage = `${errorPrefix}Kunde inte nå servern: ${error.message}`;
      }
    } else {
      const statusCode = error.response.status;
      const responseData = error.response.data;
      
      switch (statusCode) {
        case 401:
          errorMessage = `${errorPrefix}Du måste logga in`;
          break;
        case 403:
          errorMessage = `${errorPrefix}Åtkomst nekad`;
          break;
        case 404:
          errorMessage = `${errorPrefix}Kunde inte hitta data`;
          break;
        case 429:
          errorMessage = `${errorPrefix}För många förfrågningar`;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage = `${errorPrefix}Ett serverfel har inträffat (${statusCode})`;
          break;
        default:
          // Include response data in error message if available
          const responseMessage = responseData?.message || responseData?.error || error.message;
          errorMessage = `${errorPrefix}Ett fel uppstod (${statusCode}): ${responseMessage}`;
      }
    }
  } else {
    // For non-Axios errors, try to extract useful information
    errorMessage = error instanceof Error ? error.message : String(error);
  }
  
  // Show toast for user feedback
  toast.error(errorMessage);
  
  // Return an observable that immediately errors
  return throwError(() => new Error(errorMessage));
}
