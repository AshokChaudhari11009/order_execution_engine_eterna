import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Order } from '../models/Order.js';

// Redis configuration - supports both local and containerized environments
export const REDIS_URL = process.env.REDIS_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'redis://redis:6379'  // Docker service name
    : 'redis://127.0.0.1:6379');  // Local development

export const QUEUE_NAME = process.env.QUEUE_NAME || 'orders';

// PostgreSQL configuration - supports both local and containerized environments
const defaultDbUrl = process.env.NODE_ENV === 'production'
  ? 'postgres://postgres:postgres@postgres:5432/orders'  // Docker service name
  : 'postgres://postgres:postgres@127.0.0.1:5432/orders';  // Local development

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || defaultDbUrl,
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
