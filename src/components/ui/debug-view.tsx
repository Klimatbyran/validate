import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WORKFLOW_STAGES } from '@/lib/constants';
import { toast } from 'sonner';
import type { Job } from '@/lib/types';
import { useProcesses } from '@/hooks/useProcesses';

export function DebugView() {
  const { processes, isLoading, isError, error, refresh } = useProcesses();
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);

  useEffect(() => {
    if(selectedProcessId) {
      const jobs = processes?.find(p => p.id === selectedProcessId)?.jobs ?? [];
      setSelectedJobs(jobs);
    } else {
      const jobs = processes?.flatMap(p => p.jobs) ?? [];
      setSelectedJobs(jobs);
    }
  }, [selectedProcessId, processes]);

  const handleRefresh = () => {
    console.log('Refreshing debug view...');
    toast.promise(
      refresh().then(() => {
        console.log('Debug view refresh completed');
      }).catch(err => {
        console.error('Debug view refresh failed:', err);
        throw err;
      }),
      {
        loading: 'Uppdaterar debugvy...',
        success: 'Debugvy uppdaterad',
        error: (err) => `Kunde inte uppdatera debugvy: ${err.message || 'Okänt fel'}`
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 text-gray-02 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-pink-03">
            <AlertCircle className="w-6 h-6 mr-2" />
            <span>{error?.message || 'Ett fel uppstod'}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="ml-4 whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Försök igen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Thread Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-3xl text-gray-01">Processes</h3>
            <p className="text-gray-02 mt-1">
              {processes.length} active processes
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-gray-02 hover:text-gray-01"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processes.map(process => {
            let statusColor = 'bg-gray-03';
            let textColor = 'text-gray-01';
            let icon = <Clock className="w-5 h-5" />;
            
            switch ("completed") {
              case 'completed':
                statusColor = 'bg-green-03';
                textColor = 'text-green-01';
                icon = <CheckCircle2 className="w-5 h-5" />;
                break;
              case 'failed':
                statusColor = 'bg-pink-03';
                textColor = 'text-pink-01';
                icon = <XCircle className="w-5 h-5" />;
                break;
              case 'processing':
                statusColor = 'bg-blue-03';
                textColor = 'text-blue-01';
                icon = <Clock className="w-5 h-5 animate-spin" />;
                break;
            }

            return (
              <button
                key={process.id}
                onClick={() => setSelectedProcessId(
                  selectedProcessId === process.id ? null : process.id
                )}
                className={`
                  p-4 rounded-lg text-left
                  transition-colors duration-200
                  ${selectedProcessId === process.id ? statusColor + '/20' : 'hover:bg-gray-03/10'}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={textColor}>{process.company ?? "Unknown"}</span>
                  <div className={`${statusColor} p-2 rounded-full`}>
                    {icon}
                  </div>
                </div>
                <div className="font-mono text-sm text-gray-02 truncate">
                  {process.id}
                </div>
                <div className="text-sm text-gray-02 mt-1">
                  {process.jobs?.length ?? 0} jobs
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Job Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-3xl text-gray-01">
            {selectedProcessId ? 'Trådens jobb' : 'Alla jobb'}
          </h3>
          <div className="text-sm text-gray-02">
            {selectedJobs.length} jobs
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-03">
                <th className="text-left p-4 text-gray-02">ID</th>
                <th className="text-left p-4 text-gray-02">Queue</th>
                <th className="text-left p-4 text-gray-02">Company</th>
                <th className="text-left p-4 text-gray-02">Process ID</th>
                <th className="text-left p-4 text-gray-02">Status</th>
                <th className="text-left p-4 text-gray-02">Created</th>
                <th className="text-left p-4 text-gray-02">Started</th>
                <th className="text-left p-4 text-gray-02">Finished</th>
              </tr>
            </thead>
            <tbody>
              {selectedJobs.map(job => {
                let statusIcon;
                let statusColor;
                
                if (job.finishedOn) {
                  if (job.isFailed) {
                    statusIcon = <XCircle className="w-5 h-5 text-pink-03" />;
                    statusColor = 'text-pink-03';
                  } else {
                    statusIcon = <CheckCircle2 className="w-5 h-5 text-green-03" />;
                    statusColor = 'text-green-03';
                  }
                } else if (job.processedOn) {
                  statusIcon = <Clock className="w-5 h-5 text-blue-03 animate-spin" />;
                  statusColor = 'text-blue-03';
                } else {
                  statusIcon = <Clock className="w-5 h-5 text-gray-02" />;
                  statusColor = 'text-gray-02';
                }

                return (
                  <tr key={`${job.queue}-${job.id}`} className="border-b border-gray-03/50">
                    <td className="p-4 text-gray-01 font-mono text-sm">
                      {job.id}
                    </td>
                    <td className="p-4">
                      <span className="text-orange-03">
                        {WORKFLOW_STAGES.find(s => s.id === job.queue)?.name || job.queue}
                      </span>
                    </td>
                    <td className="p-4 text-gray-01">
                      {"-"}
                    </td>
                    <td className="p-4 font-mono text-sm text-gray-02">
                      {job.processId}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {statusIcon}
                        <span className={statusColor}>
                          {job.finishedOn 
                            ? (job.isFailed ? 'Misslyckad' : 'Klar')
                            : (job.processedOn ? 'Bearbetar' : 'Väntar')}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-02">
                      {new Date(job.timestamp).toLocaleString('sv-SE')}
                    </td>
                    <td className="p-4 text-gray-02">
                      {job.processedOn 
                        ? new Date(job.processedOn).toLocaleString('sv-SE')
                        : '-'}
                    </td>
                    <td className="p-4 text-gray-02">
                      {job.finishedOn
                        ? new Date(job.finishedOn).toLocaleString('sv-SE')
                        : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
