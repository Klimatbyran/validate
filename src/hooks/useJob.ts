import { DataJob } from '@/lib/types';
import useSWR from 'swr';

export function useJob(jobId: string, queueName: string) {
  const { data, error, isLoading, mutate } = useSWR(queueName && jobId ? `/api/queues/${queueName}/${jobId}` : null, fetchJob);

  return {
    job: data ?? null,
    isLoading,
    isError: error ?? false,
    error,
    refresh: () => {
      console.log('🔄 Manually refreshing queues');
      return mutate();
    },
  };
}

async function fetchJob(url: string): Promise<DataJob> {
  const response = await fetch(url);
  if(!response.ok) throw new Error('Could not fetch job');
  return await response.json();
}