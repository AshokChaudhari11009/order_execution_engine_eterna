import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAME, REDIS_URL, AppDataSource } from '../config/env.js';
import { wsHub } from '../utils/wsHub.js';
import { Order } from '../models/Order.js';
import { OrderExecutor } from './OrderExecutor.js';
import { logger } from '../utils/logger.js';

export const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
export const orderQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  } as JobsOptions,
});

let worker: Worker | null = null;
let events: QueueEvents | null = null;

export async function initQueue() {
  // Events for logging and observability
  events = new QueueEvents(QUEUE_NAME, { connection });
  events.on('failed', ({ jobId, failedReason }) => {
    logger.error(`Job ${jobId} failed: ${failedReason}`);
  });
  events.on('completed', ({ jobId }) => {
    logger.info(`Job ${jobId} completed`);
  });

  const executor = new OrderExecutor();

  // Processor
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { orderId } = job.data as { orderId: string };

      try {
        // Mark pending just in case
        const repo = AppDataSource.getRepository(Order);
        const order = await repo.findOneByOrFail({ id: orderId });
        if (order.status === 'pending') wsHub.publish(order.id, { orderId, status: 'pending' });

        await executor.execute(orderId);
      } catch (e: any) {
        // Persist failure reason if not already persisted
        try {
          const repo = AppDataSource.getRepository(Order);
          const o = await repo.findOneBy({ id: orderId });
          if (o && o.status !== 'failed') {
            o.status = 'failed';
            o.failureReason = String(e?.message || e);
            await repo.save(o);
            wsHub.publish(orderId, { orderId, status: 'failed', error: o.failureReason });
          }
        } catch (inner) {
          logger.error(inner, 'Error persisting failure');
        }
        throw e; // let BullMQ handle retries
      }
    },
    {
      connection,
      concurrency: 10, // up to 10 concurrent orders
      limiter: {
        // ~100 jobs per minute
        max: 100,
        duration: 60_000,
      },
    }
  );

  worker.on('error', (err) => logger.error(err, 'Worker error'));
}

export async function shutdownQueue() {
  await worker?.close();
  await events?.close();
  await orderQueue.close();
  await connection.quit();
}
