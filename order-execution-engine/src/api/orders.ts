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
      try {
        // Fastify provides req.url as path with query string (e.g., "/api/orders/execute?orderId=xxx")
        // or we can use req.query directly
        const orderId = req.query?.orderId || (() => {
          // Fallback: parse from URL if query is not available
          const urlMatch = req.url?.match(/[?&]orderId=([^&]+)/);
          return urlMatch ? urlMatch[1] : null;
        })();

        if (!orderId) {
          connection.socket.send(JSON.stringify({ error: 'Missing orderId in query' }));
          connection.socket.close(1008, 'Missing orderId');
          return;
        }

        // Subscribe to order updates
        wsHub.subscribe(orderId, connection);
        
        // Send confirmation
        connection.socket.send(JSON.stringify({ 
          ok: true, 
          orderId, 
          message: 'Subscribed to order updates' 
        }));

        // Log for debugging
        console.log(`WebSocket subscribed to order: ${orderId}`);
      } catch (error: any) {
        console.error('WebSocket error:', error);
        try {
          connection.socket.send(JSON.stringify({ 
            error: 'Internal server error', 
            message: error.message 
          }));
        } catch (e) {
          // Connection might already be closed
        }
        connection.socket.close(1011, 'Internal error');
      }
    }
  );
}
