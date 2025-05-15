import { DataJob } from '@/lib/types';
import useSWR from 'swr';

export function useQueueJobs(queueName?: string) {
  const { data, error, isLoading, mutate } = useSWR((queueName ?? "") ? `/api/queues/${queueName}` : null, fetchJobs);

  return {
    jobs: data ?? null,
    isLoading,
    isError: error ?? false,
    error,
    refresh: () => {
      console.log('🔄 Manually refreshing queues');
      return mutate();
    },
  };
}

async function fetchJobs(url: string): Promise<DataJob> {
  const response = await fetch(url);
  if(!response.ok) throw new Error('Could not fetch jobs');
  return await response.json();
}