import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import type { ReportType } from '@clippingai/database';
import { generateReport, type ReportGenerationInput } from './reportGeneration.js';
import { saveGeneratedReport } from './reportStorage.js';
import { prisma } from '@clippingai/database';

// ============================================================================
// REDIS CONNECTION
// ============================================================================

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on('error', (err) => {
  console.error('Redis connection error:', err);
});

connection.on('connect', () => {
  console.log('✅ Connected to Redis');
});

// ============================================================================
// JOB TYPES
// ============================================================================

export interface ReportJobData {
  companyName: string;
  companyDomain: string;
  industry?: string;
  competitors?: string[];
  reportType: ReportType;
  dateRange?: number;
  userId?: string;
  reportConfigId?: string;
  generatedReportId?: string; // Pre-created report ID to update
  isPublic?: boolean;
}

export interface ReportJobResult {
  reportId: string;
  publicSlug: string | null;
  generationDurationMs: number;
}

// ============================================================================
// QUEUE SETUP
// ============================================================================

export const reportQueue = new Queue<ReportJobData, ReportJobResult>('report-generation', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 200, // Keep last 200 failed jobs for debugging
    },
  },
});

console.log('📋 Report generation queue initialized');

// ============================================================================
// WORKER SETUP
// ============================================================================

let worker: Worker<ReportJobData, ReportJobResult> | null = null;

export function startWorker() {
  if (worker) {
    console.log('⚠️ Worker already running');
    return worker;
  }

  worker = new Worker<ReportJobData, ReportJobResult>(
    'report-generation',
    async (job: Job<ReportJobData, ReportJobResult>) => {
      const startTime = Date.now();
      console.log(`\n🔄 Processing job ${job.id}: ${job.data.reportType} for ${job.data.companyName}`);

      try {
        // Update job progress
        await job.updateProgress(10);

        // Generate the report
        await job.updateProgress(20);
        const reportContent = await generateReport({
          companyName: job.data.companyName,
          companyDomain: job.data.companyDomain,
          industry: job.data.industry,
          competitors: job.data.competitors,
          reportType: job.data.reportType,
          dateRange: job.data.dateRange || 7,
        });

        await job.updateProgress(90);

        const generationDurationMs = Date.now() - startTime;

        // If we have a pre-created report ID, update it; otherwise create new
        let reportId: string;
        let publicSlug: string | null = null;

        if (job.data.generatedReportId) {
          // Update the existing report with content
          const updated = await prisma.generatedReport.update({
            where: { id: job.data.generatedReportId },
            data: {
              status: 'completed',
              content: reportContent,
              generationCompletedAt: new Date(),
              generationDurationMs,
              isPublic: job.data.isPublic || false,
            },
          });
          reportId = updated.id;
          publicSlug = updated.publicSlug;
          console.log(`✅ Updated existing report ${reportId}`);
        } else {
          // Legacy path: create new report
          const saved = await saveGeneratedReport({
            userId: job.data.userId,
            reportConfigId: job.data.reportConfigId,
            companyName: job.data.companyName,
            companyDomain: job.data.companyDomain,
            reportType: job.data.reportType,
            industry: job.data.industry,
            competitors: job.data.competitors,
            content: reportContent,
            generationDurationMs,
            isPublic: job.data.isPublic || false,
          });
          reportId = saved.reportId;
          publicSlug = saved.publicSlug;
        }

        await job.updateProgress(100);

        console.log(`✅ Job ${job.id} completed in ${generationDurationMs}ms - Report ID: ${reportId}`);

        return {
          reportId,
          publicSlug,
          generationDurationMs,
        };
      } catch (error) {
        console.error(`❌ Job ${job.id} failed:`, error);

        // Update report status to failed if we have a report ID
        const reportIdToUpdate = job.data.generatedReportId;
        if (reportIdToUpdate) {
          try {
            await prisma.generatedReport.update({
              where: { id: reportIdToUpdate },
              data: {
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                generationCompletedAt: new Date(),
              },
            });
          } catch (dbError) {
            console.error('Failed to update report status:', dbError);
          }
        } else if (job.data.reportConfigId) {
          // Fallback: update any generating reports for this config
          try {
            await prisma.generatedReport.updateMany({
              where: {
                reportConfigId: job.data.reportConfigId,
                status: 'generating',
              },
              data: {
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
              },
            });
          } catch (dbError) {
            console.error('Failed to update report status:', dbError);
          }
        }

        throw error;
      }
    },
    {
      connection,
      concurrency: 2, // Process up to 2 jobs simultaneously
      limiter: {
        max: 10, // Max 10 jobs per duration
        duration: 60000, // 1 minute
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  console.log('👷 Report generation worker started');

  return worker;
}

export function stopWorker() {
  if (worker) {
    console.log('🛑 Stopping worker...');
    worker.close();
    worker = null;
  }
}

// ============================================================================
// JOB MANAGEMENT
// ============================================================================

export async function addReportJob(data: ReportJobData): Promise<Job<ReportJobData, ReportJobResult>> {
  const job = await reportQueue.add('generate-report', data, {
    jobId: `report-${data.companyDomain}-${Date.now()}`,
  });

  console.log(`📝 Queued job ${job.id} for ${data.companyName}`);
  return job;
}

export async function getJobStatus(jobId: string) {
  const job = await reportQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    state, // 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
    progress,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
  };
}

export async function cancelJob(jobId: string): Promise<boolean> {
  const job = await reportQueue.getJob(jobId);

  if (!job) {
    return false;
  }

  await job.remove();
  console.log(`🗑️ Cancelled job ${jobId}`);
  return true;
}

// ============================================================================
// QUEUE STATS
// ============================================================================

export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    reportQueue.getWaitingCount(),
    reportQueue.getActiveCount(),
    reportQueue.getCompletedCount(),
    reportQueue.getFailedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed,
  };
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

export async function cleanup() {
  console.log('🧹 Cleaning up job queue...');

  if (worker) {
    await worker.close();
    worker = null;
  }

  await reportQueue.close();
  await connection.quit();

  console.log('✅ Job queue cleanup complete');
}

// Auto-start worker if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startWorker();
}
