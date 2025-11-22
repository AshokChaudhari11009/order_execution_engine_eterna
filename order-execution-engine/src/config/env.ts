import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Order } from '../models/Order.js';
import { logger } from '../utils/logger.js';

// Detect if we're running in a cloud environment (Railway, Render, etc.)
const isCloudEnvironment = !!(
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_SERVICE_NAME ||
  process.env.RENDER ||
  process.env.FLY_APP_NAME ||
  process.env.VERCEL ||
  process.env.HEROKU_APP_NAME
);

// Redis configuration - supports both local and containerized environments
const getRedisUrl = (): string => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  
  if (isCloudEnvironment) {
    throw new Error(
      'REDIS_URL environment variable is required in cloud environments. ' +
      'Please add a Redis service and link it to your application. ' +
      'On Railway: Add Redis service → Variables tab → Link REDIS_URL'
    );
  }
  
  // Docker Compose fallback
  if (process.env.NODE_ENV === 'production') {
    return 'redis://redis:6379';
  }
  
  // Local development fallback
  return 'redis://127.0.0.1:6379';
};

export const REDIS_URL = getRedisUrl();
export const QUEUE_NAME = process.env.QUEUE_NAME || 'orders';

// PostgreSQL configuration - supports both local and containerized environments
const getDatabaseUrl = (): string => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  if (isCloudEnvironment) {
    throw new Error(
      'DATABASE_URL environment variable is required in cloud environments. ' +
      'Please add a PostgreSQL service and link it to your application. ' +
      'On Railway: Add PostgreSQL service → Variables tab → Link DATABASE_URL'
    );
  }
  
  // Docker Compose fallback
  if (process.env.NODE_ENV === 'production') {
    return 'postgres://postgres:postgres@postgres:5432/orders';
  }
  
  // Local development fallback
  return 'postgres://postgres:postgres@127.0.0.1:5432/orders';
};

const databaseUrl = getDatabaseUrl();

// Log connection info (without sensitive data)
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  logger.info(`Using DATABASE_URL from environment: ${url.protocol}//${url.hostname}:${url.port}${url.pathname}`);
} else {
  logger.info(`Using default DATABASE_URL: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);
}

if (process.env.REDIS_URL) {
  logger.info(`Using REDIS_URL from environment`);
} else {
  logger.info(`Using default REDIS_URL: ${REDIS_URL.replace(/:[^:@]+@/, ':****@')}`);
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [Order],
  synchronize: true, // For demo; in prod use migrations
  logging: false,
  extra: {
    // Connection pool settings for better reliability
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  },
});
