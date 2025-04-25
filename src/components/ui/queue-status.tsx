import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, WifiOff, AlertCircle } from 'lucide-react';
import { useQueues } from '@/hooks/useQueues';
import { useQueueStats } from '@/hooks/useQueueStats';
import { Button } from '@/components/ui/button';
import { WORKFLOW_STAGES } from '@/lib/constants';
import { toast } from 'sonner';

export function QueueStatus() {
  const { isLoading, isError, error, refresh } = useQueues();
  const { totals, queueStats } = useQueueStats();

  const handleRefresh = () => {
    toast.promise(refresh(), {
      loading: 'Updating the queue status...',
      success: 'Queue status updated',
      error: 'Could not update queue status'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 text-gray-02 animate-spin" />
      </div>
    );
  }

  if (isError) {
    const isNetworkError = error?.message?.includes('internetanslutning') || 
                          error?.message?.includes('nå servern');

    return (
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-pink-03">
            {isNetworkError ? (
              <WifiOff className="w-6 h-6 mr-2" />
            ) : (
              <AlertCircle className="w-6 h-6 mr-2" />
            )}
            <span className="text-sm">{error?.message || 'Kunde inte hämta köstatus'}</span>
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

  // Calculate percentages for the progress ring
  const total = totals.completed + totals.active + totals.waiting;
  const completedPercentage = total > 0 ? (totals.completed / total) * 100 : 0;
  const activePercentage = total > 0 ? (totals.active / total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-3xl text-gray-01">System status</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-gray-02 hover:text-gray-01"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Update
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress Ring */}
          <div className="relative flex items-center justify-center">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                className="stroke-gray-03"
                strokeWidth="16"
                fill="none"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                className="stroke-blue-03"
                strokeWidth="16"
                strokeDasharray={`${activePercentage * 5.52} ${100 * 5.52}`}
                fill="none"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                className="stroke-green-03"
                strokeWidth="16"
                strokeDasharray={`${completedPercentage * 5.52} ${100 * 5.52}`}
                fill="none"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="text-6xl text-gray-01">{total}</div>
              <div className="text-base text-gray-02">Total number of jobs</div>
            </div>
          </div>

          {/* Status Grid */}
          <div className="grid grid-cols-2 gap-0">
            <div className="relative overflow-hidden rounded-tl-[20px] bg-blue-03">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-02/30 to-blue-04/30" />
              <div className="relative p-6">
                <div className="text-5xl text-blue-01">{totals.active}</div>
                <div className="text-lg text-blue-01/80">Active</div>
              </div>
            </div>
            
            <div className="relative overflow-hidden rounded-tr-[20px] bg-orange-03">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-02/30 to-orange-04/30" />
              <div className="relative p-6">
                <div className="text-5xl text-orange-01">{totals.waiting}</div>
                <div className="text-lg text-orange-01/80">Waiting</div>
              </div>
            </div>
            
            <div className="relative overflow-hidden rounded-bl-[20px] bg-green-03">
              <div className="absolute inset-0 bg-gradient-to-br from-green-02/30 to-green-04/30" />
              <div className="relative p-6">
                <div className="text-5xl text-green-01">{totals.completed}</div>
                <div className="text-lg text-green-01/80">Completed</div>
              </div>
            </div>
            
            <div className="relative overflow-hidden rounded-br-[20px] bg-pink-03">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-02/30 to-pink-04/30" />
              <div className="relative p-6">
                <div className="text-5xl text-pink-01">{totals.failed}</div>
                <div className="text-lg text-pink-01/80">Failed</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Detailed Queue List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
        {WORKFLOW_STAGES.map((stage, index) => {
          const stats = queueStats[stage.id] || {
            active: 0,
            waiting: 0,
            completed: 0,
            failed: 0,
            isPaused: false
          };
          
          const status = stats.isPaused ? 'paused' : 
                        stats.failed > 0 ? 'failed' : 
                        stats.active > 0 ? 'active' : 
                        'completed';
          
          const statusColors = {
            paused: 'bg-orange-03',
            failed: 'bg-pink-03',
            active: 'bg-blue-03',
            completed: 'bg-green-03'
          };

          const textColors = {
            paused: 'text-orange-01',
            failed: 'text-pink-01',
            active: 'text-blue-01',
            completed: 'text-green-01'
          };

          const gradientColors = {
            paused: 'from-orange-02/30 to-orange-04/30',
            failed: 'from-pink-02/30 to-pink-04/30',
            active: 'from-blue-02/30 to-blue-04/30',
            completed: 'from-green-02/30 to-green-04/30'
          };

          // Calculate rounded corners based on position
          const isFirst = index === 0;
          const isLast = index === WORKFLOW_STAGES.length - 1;
          const isTopRow = index < 3;
          const isBottomRow = index >= WORKFLOW_STAGES.length - 3;
          
          let roundedCorners = '';
          if (isFirst && isTopRow) roundedCorners = 'rounded-tl-[20px]';
          if (index === 2 && isTopRow) roundedCorners = 'rounded-tr-[20px]';
          if (isLast && isBottomRow) roundedCorners = 'rounded-br-[20px]';
          if (index === WORKFLOW_STAGES.length - 3 && isBottomRow) roundedCorners = 'rounded-bl-[20px]';

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-gray-04/80 backdrop-blur-sm ${roundedCorners} overflow-hidden border-[0.5px] border-gray-03`}
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-12 ${statusColors[status]}`}>
                    <div className={`w-full h-full bg-gradient-to-b ${gradientColors[status]}`} />
                  </div>
                  <div>
                    <h4 className={`text-lg ${textColors[status]}`}>
                      {stage.name}
                    </h4>
                    <p className={`text-base ${textColors[status]}/70`}>
                      {stats.active + stats.waiting} jobs in queue
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 border-t border-gray-03">
                <div className="p-3 text-center border-r border-gray-03">
                  <p className={`text-base ${textColors[status]}/70`}>Active</p>
                  <p className={`text-2xl ${textColors[status]}`}>{stats.active}</p>
                </div>
                <div className="p-3 text-center border-r border-gray-03">
                  <p className={`text-base ${textColors[status]}/70`}>Waiting</p>
                  <p className={`text-2xl ${textColors[status]}`}>{stats.waiting}</p>
                </div>
                <div className="p-3 text-center border-r border-gray-03">
                  <p className={`text-base ${textColors[status]}/70`}>Completed</p>
                  <p className={`text-2xl ${textColors[status]}`}>{stats.completed}</p>
                </div>
                <div className="p-3 text-center">
                  <p className={`text-base ${textColors[status]}/70`}>Failed</p>
                  <p className={`text-2xl ${textColors[status]}`}>{stats.failed}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}