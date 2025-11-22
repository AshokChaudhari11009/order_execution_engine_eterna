import { AppDataSource } from '../config/env.js';
import { Order } from '../models/Order.js';
import { wsHub } from '../utils/wsHub.js';
import { MockDexRouter } from './MockDexRouter.js';
import { logger } from '../utils/logger.js';

export class OrderExecutor {
  private router = new MockDexRouter();

  async execute(orderId: string) {
    const repo = AppDataSource.getRepository(Order);
    const order = await repo.findOneByOrFail({ id: orderId });

    // routing
    wsHub.publish(order.id, { orderId: order.id, status: 'routing' });
    order.status = 'routing';
    await repo.save(order);

    const amountInNum = Number(order.amountIn);
    const [raydium, meteora] = await Promise.all([
      this.router.getRaydiumQuote(order.tokenIn, order.tokenOut, amountInNum),
      this.router.getMeteoraQuote(order.tokenIn, order.tokenOut, amountInNum),
    ]);

    const best = raydium.price >= meteora.price ? raydium : meteora;
    logger.info({ raydium, meteora, chosen: best.venue }, 'Routing decision');

    // limit order check: only continue if best price >= limitPrice (assuming tokenOut per tokenIn)
    const limit = Number(order.limitPrice);
    if (best.price < limit) {
      const reason = `Best price ${best.price.toFixed(6)} is below limit ${limit.toFixed(6)}`;
      order.status = 'failed';
      order.failureReason = reason;
      await repo.save(order);
      wsHub.publish(order.id, { orderId: order.id, status: 'failed', error: reason });
      throw new Error(reason);
    }

    // building
    order.status = 'building';
    await repo.save(order);
    wsHub.publish(order.id, { orderId: order.id, status: 'building', dex: best.venue });

    // submitted
    order.status = 'submitted';
    await repo.save(order);
    wsHub.publish(order.id, { orderId: order.id, status: 'submitted', dex: best.venue });

    // execute
    const { txHash, executedPrice } = await this.router.executeSwap(best.venue, {
      tokenIn: order.tokenIn,
      tokenOut: order.tokenOut,
      amountIn: amountInNum,
      minAcceptablePrice: limit, // slippage protection as limit for mock
    });

    // confirmed
    order.status = 'confirmed';
    order.chosenDex = best.venue;
    order.txHash = txHash;
    order.executedPrice = String(executedPrice);
    await repo.save(order);
    wsHub.publish(order.id, {
      orderId: order.id,
      status: 'confirmed',
      dex: best.venue,
      txHash,
      executedPrice,
    });

    return order;
  }
}
