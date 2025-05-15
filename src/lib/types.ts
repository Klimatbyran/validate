import { z } from 'zod';

// Base schemas
export const CountsSchema = z.object({
  active: z.number().optional(),
  completed: z.number().optional(),
  delayed: z.number().optional(),
  failed: z.number().optional(),
  paused: z.number().optional(),
  prioritized: z.number().optional(),
  waiting: z.number().optional(),
  'waiting-children': z.number().optional(),
});

export const PaginationSchema = z.object({
  pageCount: z.number(),
  range: z.object({
    start: z.number(),
    end: z.number(),
  }),
});

export const JobOptionsSchema = z.object({
  attempts: z.number(),
  backoff: z.object({
    delay: z.number(),
    type: z.string()
  }).optional()
}).passthrough();

export const JobParentSchema = z.object({
  id: z.string(),
  queue: z.string()
}).optional();

export const JobDataSchema = z.object({
  url: z.string().optional(),
  threadId: z.string(),
  autoApprove: z.union([z.boolean(), z.string()]).transform(val => {
    if (typeof val === 'string') {
      return val.toLowerCase() === 'true' || val === '1';
    }
    return val;
  }).optional(),
  approved: z.union([z.boolean(), z.string()]).transform(val => {
    if (typeof val === 'string') {
      return val.toLowerCase() === 'true' || val === '1';
    }
    return val;
  }).optional(),
  messageId: z.string().optional(),
  company: z.string().optional(),
  companyName: z.string().optional(),
  description: z.string().optional(),
  year: z.number().optional(),
  status: z.string().optional(),
  needsApproval: z.boolean().optional(),
  comment: z.string().optional(),
}).passthrough();

export const JobSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  queue: z.string(),
  url: z.string().url().optional(),
  autoApprove: z.boolean().optional().default(false),
  timestamp: z.number(),
  processedOn: z.number().optional(),
  processId: z.string().optional(),
  finishedOn: z.number().optional(),
  progress: z.number().optional(),
  attempts: z.number().optional(),
  attemptsMade: z.number().optional(),
  delay: z.union([z.string(), z.number()]).optional(),
  stacktrace: z.array(z.string()),
  opts: JobOptionsSchema,
  parent: JobParentSchema,
  returnValue: z.union([
    z.string(),
    z.number(),
    z.null(),
    z.object({}),
    z.undefined(),
    z.boolean()
  ]).optional(),
  isFailed: z.boolean().optional(),
}).passthrough();

export const DataJobSchema = JobSchema.extend({
  data: JobDataSchema
});

export const QueueSchema = z.object({
  name: z.string(),
  type: z.enum(['bull', 'bullmq']),
  isPaused: z.boolean(),
  counts: CountsSchema,
  jobs: z.array(JobSchema),
  pagination: PaginationSchema,
  readOnlyMode: z.boolean(),
  allowRetries: z.boolean(),
  allowCompletedRetries: z.boolean(),
  delimiter: z.string(),
});

export const processSchema = z.object({
  id: z.string(),
  company: z.string().optional(),
  wikidataId: z.string().optional(),
  jobs: z.array(JobSchema)
})

export const companyProcessSchema = z.object({
  company: z.string().optional(),
  wikidataId: z.string().optional(),
  processes: z.array(processSchema.omit({company: true, wikidataId: true}))
});


export const QueueStatSchema = z.object({
  name: z.string(),
  status: CountsSchema.optional()
})

export const QueuesStatsSchema = z.array(QueueStatSchema);

// Response schemas
export const QueuesResponseSchema = z.object({
  queues: z.array(QueueSchema),
});


export const QueueJobsResponseSchema = z.object({
  queue: QueueSchema,
});

export const QueueAddJobResponseSchema = z.array(QueueSchema);

// Inferred types
export type Queue = z.infer<typeof QueueSchema>;
export type Job = z.infer<typeof JobSchema>;
export type DataJob = z.infer<typeof DataJobSchema>;
export type JobData = z.infer<typeof JobDataSchema>;
export type JobParent = z.infer<typeof JobParentSchema>;
export type QueuesResponse = z.infer<typeof QueuesResponseSchema>;
export type QueueJobsResponse = z.infer<typeof QueueJobsResponseSchema>;
export type QueuesStats = z.infer<typeof QueuesStatsSchema>;
export type QueueStats = z.infer<typeof QueueStatSchema>;
export type QueueAddJobResponse = z.infer<typeof QueueAddJobResponseSchema>;
export type Process = z.infer<typeof processSchema>;
export type CompanyProcess = z.infer<typeof companyProcessSchema>;

// Queue management types
export interface QueueJob extends Job {
  queueId: string;
}

export interface CompanyStatus {
  company: string;
  companyName?: string;
  description?: string;
  year: number;
  threadId: string;
  jobs?: QueueJob[]; // Add jobs array to store all jobs for this thread
  stages: Record<string, {
    status: 'completed' | 'failed' | 'processing' | 'pending';
    timestamp: number;
  }>;
}

export interface GroupedCompany {
  company: string;
  companyName?: string;
  description?: string;
  attempts: CompanyStatus[];
}

export interface QueueStatsState {
  totals: {
    active: number;
    waiting: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  queueStats: QueueStats;
}