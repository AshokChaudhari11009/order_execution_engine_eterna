import { FastifyInstance } from 'fastify';
import { AppDataSource } from '../config/env.js';
import { Order } from '../models/Order.js';
import { orderQueue } from '../services/OrderQueue.js';
import { wsHub } from '../utils/wsHub.js';
import { executeSchema } from '../utils/validation.js';

export async function ordersRoutes(app: FastifyInstance, opts: any) {
  // POST /api/orders/execute => create order and enqueue
  app.post('/execute', async (req, reply) => {
    const body = req.body as any;
    const parsed = executeSchema.safeParse(body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.format() });
    }

    const repo = AppDataSource.getRepository(Order);
    const order = repo.create({
      tokenIn: parsed.data.tokenIn,
      tokenOut: parsed.data.tokenOut,
      amountIn: String(parsed.data.amountIn),
      limitPrice: String(parsed.data.limitPrice),
      type: 'limit',
      status: 'pending',
    });
    await repo.save(order);

    // initial status
    wsHub.publish(order.id, { orderId: order.id, status: 'pending' });

    // Enqueue
    await orderQueue.add(
      'execute',
      { orderId: order.id },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      }
    );

    return reply.send({ orderId: order.id });
  });

  // WS /api/orders/execute?orderId=xxx => subscribe to updates
  app.get(
    '/execute',
    { websocket: true },
    (connection: any, req: any) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const orderId = url.searchParams.get('orderId');
      if (!orderId) {
        connection.socket.send(JSON.stringify({ error: 'Missing orderId in query' }));
        connection.socket.close();
        return;
      }
      wsHub.subscribe(orderId, connection);
      connection.socket.send(JSON.stringify({ ok: true, orderId, message: 'Subscribed' }));
    }
  );
}
