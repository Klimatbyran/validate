import { CompanyProcess } from '@/lib/types';
import useSWR from 'swr';

export function useCompanyProcesses(refreshInterval = 0) {
  const { data, error, isLoading, mutate } = useSWR('/api/processes/companies', fetchCompanyProcesses, {
    refreshInterval: refreshInterval,
    dedupingInterval: 2000,
  });

  return {
    companies: data ?? [],
    isLoading,
    isError: error ?? false,
    error,
    refresh: () => {
      console.log('🔄 Manually refreshing queues');
      return mutate();
    },
  };
}

async function fetchCompanyProcesses(): Promise<CompanyProcess[]> {
  const response = await fetch('/api/processes/companies');
  if(!response.ok) throw new Error('Could not fetch company processes');
  return await response.json();
}