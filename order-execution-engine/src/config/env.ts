import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Order } from '../models/Order.js';

export const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
export const QUEUE_NAME = process.env.QUEUE_NAME || 'orders';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/orders',
  entities: [Order],
  synchronize: true, // For demo; in prod use migrations
  logging: false,
});
