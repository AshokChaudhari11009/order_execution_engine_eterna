import 'reflect-metadata';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { ordersRoutes } from './api/orders.js';
import { initQueue } from './services/OrderQueue.js';
import { AppDataSource } from './config/env.js';
import { wsHub } from './utils/wsHub.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  const app = Fastify({ logger: true });
  logger.info('Registering CORS');
  await app.register(cors, { origin: true });
  logger.info('Registering WebSocket');
  await app.register(websocket);

  // Register routes (POST and WS on same path)
  logger.info('Registering routes');
  await app.register(ordersRoutes, { prefix: '/api/orders' });

  // Init DB
  logger.info('Initializing database');
  await AppDataSource.initialize();
  logger.info('Database connected');

  // Init Queue processor
  logger.info('Initializing queue');
  await initQueue();
  logger.info('Queue initialized');

  // Health
  app.get('/health', async () => ({ ok: true }));

  const port = Number(process.env.PORT || 3001);
  const host = '0.0.0.0';
  logger.info(`Starting server on http://${host}:${port}`);
  await app.listen({ port, host });
  logger.info(`Server listening on http://${host}:${port}`);

  // Handle graceful shutdown
  const shutdown = async () => {
    try {
      logger.info('Shutting down');
      await wsHub.closeAll();
      await app.close();
      await AppDataSource.destroy();
      process.exit(0);
    } catch (e) {
      logger.error(e, 'Error during shutdown');
      process.exit(1);
    }
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
