import { Injectable, Logger } from '@nestjs/common';

export interface Job {
  id: string;
  type: string;
  data: any;
  priority: number;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface JobProcessor {
  type: string;
  process: (job: Job) => Promise<any>;
}

@Injectable()
export class JobQueueService {
  private readonly logger = new Logger(JobQueueService.name);
  private readonly jobs: Map<string, Job> = new Map();
  private readonly processors: Map<string, JobProcessor> = new Map();
  private readonly processingJobs: Set<string> = new Set();
  private isProcessing = false;

  /**
   * Register a job processor
   */
  registerProcessor(processor: JobProcessor): void {
    this.processors.set(processor.type, processor);
    this.logger.log(`Registered processor for job type: ${processor.type}`);
  }

  /**
   * Add a job to the queue
   */
  async addJob(
    type: string,
    data: any,
    priority: number = 0,
    maxAttempts: number = 3
  ): Promise<string> {
    const jobId = this.generateJobId();
    const job: Job = {
      id: jobId,
      type,
      data,
      priority,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts,
      status: 'pending'
    };

    this.jobs.set(jobId, job);
    this.logger.debug(`Added job to queue: ${type}`, { jobId, priority });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processJobs();
    }

    return jobId;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      job.status = 'failed';
      job.error = 'Job cancelled';
      this.logger.debug(`Cancelled job: ${jobId}`);
      return true;
    }
    return false;
  }

  /**
   * Process jobs in the queue
   */
  private async processJobs(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.logger.debug('Starting job processing');

    try {
      while (true) {
        const pendingJobs = Array.from(this.jobs.values())
          .filter(job => job.status === 'pending')
          .sort((a, b) => b.priority - a.priority);

        if (pendingJobs.length === 0) {
          break;
        }

        // Process jobs in parallel (up to 5 concurrent jobs)
        const jobsToProcess = pendingJobs.slice(0, 5);
        const promises = jobsToProcess.map(job => this.processJob(job));
        
        await Promise.allSettled(promises);
      }
    } catch (error) {
      this.logger.error('Error in job processing loop:', error);
    } finally {
      this.isProcessing = false;
      this.logger.debug('Job processing completed');
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    if (this.processingJobs.has(job.id)) {
      return; // Already processing
    }

    this.processingJobs.add(job.id);
    job.status = 'processing';
    job.attempts++;

    try {
      const processor = this.processors.get(job.type);
      if (!processor) {
        throw new Error(`No processor found for job type: ${job.type}`);
      }

      this.logger.debug(`Processing job: ${job.type}`, { jobId: job.id, attempt: job.attempts });

      const result = await processor.process(job);
      
      job.status = 'completed';
      job.result = result;
      
      this.logger.debug(`Job completed successfully: ${job.type}`, { jobId: job.id });
    } catch (error) {
      this.logger.error(`Job failed: ${job.type}`, { 
        jobId: job.id, 
        attempt: job.attempts,
        error: error.message 
      });

      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        job.error = error.message;
        this.logger.error(`Job failed permanently: ${job.type}`, { jobId: job.id });
      } else {
        // Retry the job
        job.status = 'pending';
        this.logger.debug(`Job will be retried: ${job.type}`, { jobId: job.id });
      }
    } finally {
      this.processingJobs.delete(job.id);
    }
  }

  /**
   * Generate a unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
    };
  }

  /**
   * Clean up old completed jobs
   */
  cleanupOldJobs(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.createdAt < cutoffTime
      ) {
        this.jobs.delete(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} old jobs`);
    }
  }

  /**
   * Get jobs by type
   */
  getJobsByType(type: string): Job[] {
    return Array.from(this.jobs.values()).filter(job => job.type === type);
  }

  /**
   * Get failed jobs
   */
  getFailedJobs(): Job[] {
    return Array.from(this.jobs.values()).filter(job => job.status === 'failed');
  }

  /**
   * Retry failed job
   */
  retryJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'failed') {
      job.status = 'pending';
      job.attempts = 0;
      job.error = undefined;
      this.logger.debug(`Retrying job: ${jobId}`);
      return true;
    }
    return false;
  }
}
