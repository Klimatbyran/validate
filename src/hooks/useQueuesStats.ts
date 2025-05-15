import type {  QueueStats } from '@/lib/types';
import useSWR from 'swr';

interface TotalQueuesStats {
    totals: {
        active: number;
        waiting: number;
        completed: number;
        failed: number;
        delayed: number;
        paused: number;
    };
    queuesStats: QueueStats[];
}

export function useQueuesStats(refreshInterval = 0) {
  const { data, error, isLoading, mutate } = useSWR('/api/queues/stats', fetchQueuesStats, {
    refreshInterval: refreshInterval,
    dedupingInterval: 2000,
  });

  return {
    totals: data?.totals,
    queuesStats: data?.queuesStats,
    isLoading,
    isError: error ?? false,
    error,
    refresh: () => {
      console.log('🔄 Manually refreshing queues');
      return mutate();
    },
  };
}

async function fetchQueuesStats(): Promise<TotalQueuesStats> {
  const response = await fetch('/api/queues/stats');
  if(!response.ok) throw new Error('Could not fetch queue stats');
  const data = await response.json();
  return calcualateTotalQueueStats(data);
}

function calcualateTotalQueueStats(queuesStats: QueueStats[]): TotalQueuesStats {
  const totals = queuesStats.reduce((acc, queue) => {
    const status = queue.status;
    acc.active += status?.active || 0;
    acc.waiting += status?.waiting || 0;
    acc.completed += status?.completed || 0;
    acc.failed += status?.failed || 0;
    acc.delayed += status?.delayed || 0;
    acc.paused += status?.paused || 0; 
    return acc;
  }, {
    active: 0,
    waiting: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0,
  });

  return {
    totals,
    queuesStats
  };
}