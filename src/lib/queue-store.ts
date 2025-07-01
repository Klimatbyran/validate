import { BehaviorSubject, Observable, combineLatest, map, shareReplay, distinctUntilChanged, debounceTime, EMPTY } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import type { Queue, QueueJob, CompanyStatus, GroupedCompany, QueueStats, QueueStatsState } from './types';
import { WORKFLOW_STAGES } from './constants';
import { groupQueues, groupByCompany } from './operators';
import { fetchQueueJobs, fetchAllHistoricalJobs } from './api';

export class QueueStore {
  private queues: Record<string, BehaviorSubject<Queue | null>> = {};
  private pollingIntervals: Record<string, number> = {};
  private historicallyLoaded = new Set<string>();
  private groupedCompanies$ = new BehaviorSubject<GroupedCompany[]>([]);
  private queueStats$ = new BehaviorSubject<QueueStatsState>({
    totals: {
      active: 0,
      waiting: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    },
    queueStats: {}
  });

  constructor() {
    WORKFLOW_STAGES.forEach(stage => {
      this.queues[stage.id] = new BehaviorSubject<Queue | null>(null);
    });

    // Create a shared stream of all queues that can be reused
    const sharedQueues$ = this.getAllQueues().pipe(
      shareReplay(1)
    );

    // Use the shared stream for both pipelines
    this.setupDataPipeline(sharedQueues$);
    this.setupStatsPipeline(sharedQueues$);
  }

  private setupStatsPipeline(queues$: Observable<{ queueId: string; queue: Queue | null }[]>) {
    queues$.pipe(
      debounceTime(300), // Increased debounce time to reduce processing frequency
      distinctUntilChanged((prev, curr) => {
        // More sophisticated comparison to avoid unnecessary updates
        if (prev.length !== curr.length) return false;
        
        return prev.every((prevItem, index) => {
          const currItem = curr[index];
          if (prevItem.queueId !== currItem.queueId) return false;
          if (!prevItem.queue && !currItem.queue) return true;
          if (!prevItem.queue || !currItem.queue) return false;
          
          return prevItem.queue.counts.active === currItem.queue.counts.active &&
                 prevItem.queue.counts.waiting === currItem.queue.counts.waiting &&
                 prevItem.queue.counts.completed === currItem.queue.counts.completed &&
                 prevItem.queue.counts.failed === currItem.queue.counts.failed;
        });
      }),
      map(queues => {
        const stats: QueueStatsState = {
          totals: {
            active: 0,
            waiting: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            paused: 0,
          },
          queueStats: {}
        };

        queues.forEach(({ queueId, queue }) => {
          if (!queue) {
            stats.queueStats[queueId] = this.getEmptyQueueStats();
            return;
          }

          const queueStats = {
            active: queue.counts.active,
            waiting: queue.counts.waiting + queue.counts['waiting-children'],
            completed: queue.counts.completed,
            failed: queue.counts.failed,
            isPaused: queue.isPaused
          };

          stats.totals.active += queue.counts.active;
          stats.totals.waiting += queue.counts.waiting + queue.counts['waiting-children'];
          stats.totals.completed += queue.counts.completed;
          stats.totals.failed += queue.counts.failed;
          stats.totals.delayed += queue.counts.delayed;
          stats.totals.paused += queue.isPaused ? 1 : 0;

          stats.queueStats[queueId] = queueStats;
        });

        return stats;
      }),
      distinctUntilChanged((prev, curr) => 
        prev.totals.active === curr.totals.active &&
        prev.totals.waiting === curr.totals.waiting &&
        prev.totals.completed === curr.totals.completed &&
        prev.totals.failed === curr.totals.failed
      ),
      shareReplay(1)
    ).subscribe(stats => {
      this.queueStats$.next(stats);
    });
  }

  // VIKTIGT: Använd endast reaktiva RxJS-metoder. Statiska objekt, globala variabler 
  // och blockerande metoder som toArray() är FÖRBJUDNA.
  private setupDataPipeline(queues$: Observable<{ queueId: string; queue: Queue | null }[]>) {
    queues$.pipe(
      debounceTime(100), // Debounce rapid updates
      groupQueues(),
      groupByCompany(),
      // Använd shareReplay för att dela resultatet mellan flera subscribers
      // utan att behöva köra om hela pipeline
      shareReplay(1)
    ).subscribe(
      companies => {
        this.groupedCompanies$.next(companies);
      },
      error => {
        this.groupedCompanies$.next([]);
      }
    );
  }

  private getAllQueues(): Observable<{ queueId: string; queue: Queue | null }[]> {
    return combineLatest(
      Object.entries(this.queues).map(([id, subject]) =>
        subject.pipe(
          distinctUntilChanged((prev, curr) => 
            prev?.counts.active === curr?.counts.active &&
            prev?.counts.waiting === curr?.counts.waiting &&
            prev?.counts.completed === curr?.counts.completed &&
            prev?.counts.failed === curr?.counts.failed
          ),
          map(queue => ({
            queueId: id,
            queue
          }))
        )
      )
    );
  }

  private getEmptyQueueStats(): QueueStats {
    return {
      active: 0,
      waiting: 0,
      completed: 0,
      failed: 0,
      isPaused: false
    };
  }

  updateQueue(queueId: string, queue: Queue | null) {
    const subject = this.queues[queueId];
    if (subject) {
      subject.next(queue);
    }
  }

  getGroupedCompanies(): Observable<GroupedCompany[]> {
    return this.groupedCompanies$.asObservable();
  }

  getQueueStats(): Observable<QueueStatsState> {
    return this.queueStats$.asObservable();
  }
  
  // VIKTIGT: Använd endast reaktiva RxJS-metoder. Statiska objekt, globala variabler 
  // och blockerande metoder som toArray() är FÖRBJUDNA.
  
  // Load historical data for a queue and then start polling for updates
  loadQueueWithUpdates(queueId: string): void {
    if (this.historicallyLoaded.has(queueId)) {
      return;
    }
    
    // Steg 1: Ladda alla historiska jobb (äldst först) reaktivt
    fetchAllHistoricalJobs(queueId).pipe(
      // När historisk laddning är klar, uppdatera kön och starta polling
      tap(historicalData => {
        this.updateQueue(queueId, historicalData.queue);
        
        // Markera som historiskt laddad
        this.historicallyLoaded.add(queueId);
        
        // Steg 2: Starta polling för uppdateringar (nyast först)
        this.pollQueueUpdates(queueId);
      }),
      catchError(error => {
        return EMPTY;
      })
    ).subscribe();
  }
  
  // Poll for updates to a queue
  private pollQueueUpdates(queueId: string): void {
    // Use a separate interval for each queue to avoid overwhelming the server
    const intervalId = setInterval(async () => {
      try {
        // Only fetch the most recent jobs (newest first)
        const updates = await fetchQueueJobs(queueId, 'latest', 1, 10, 'desc');
        this.updateQueue(queueId, updates.queue);
      } catch (error) {
        // Silently handle polling errors
      }
    }, 1000); // Poll every second
    
    // Store the interval ID so we can clear it later if needed
    this.pollingIntervals[queueId] = intervalId;
  }
  
  // Stop polling updates for a queue
  stopPollingUpdates(queueId: string): void {
    if (this.pollingIntervals[queueId]) {
      clearInterval(this.pollingIntervals[queueId]);
      delete this.pollingIntervals[queueId];
    }
  }
}

export const queueStore = new QueueStore();
