import { Process } from '@/lib/types';
import useSWR from 'swr';

export function useProcesses(refreshInterval = 0) {
  const { data, error, isLoading, mutate } = useSWR('/api/processes', fetchProcesses, {
    refreshInterval: refreshInterval,
    dedupingInterval: 2000,
  });

  return {
    processes: data ?? [],
    isLoading,
    isError: error ?? false,
    error,
    refresh: () => {
      console.log('🔄 Manually refreshing queues');
      return mutate();
    },
  };
}

async function fetchProcesses(): Promise<Process[]> {
  const response = await fetch('/api/processes');
  if(!response.ok) throw new Error('Could not fetch company processes');
  return await response.json();
}