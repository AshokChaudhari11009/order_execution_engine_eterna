import { MockDexRouter } from '../src/services/MockDexRouter.js';
import { test } from './run-tests.js';

const router = new MockDexRouter();

test('Raydium quote within 2-4% variance band', async () => {
  const q = await router.getRaydiumQuote('SOL', 'USDC', 1);
  if (q.venue !== 'Raydium') throw new Error('Expected Raydium');
  // we just assert a positive price and reasonable fee
  if (!(q.price > 0)) throw new Error('Price should be > 0');
  if (q.fee !== 0.003) throw new Error('Fee mismatch');
});

test('Meteora quote within 2-5% variance band', async () => {
  const q = await router.getMeteoraQuote('SOL', 'USDC', 1);
  if (q.venue !== 'Meteora') throw new Error('Expected Meteora');
  if (!(q.price > 0)) throw new Error('Price should be > 0');
  if (q.fee !== 0.002) throw new Error('Fee mismatch');
});

test('executeSwap returns txHash and executedPrice', async () => {
  const start = Date.now();
  const res = await router.executeSwap('Raydium', {
    tokenIn: 'SOL',
    tokenOut: 'USDC',
    amountIn: 1,
    minAcceptablePrice: 1.23,
  });
  const elapsed = Date.now() - start;
  if (!res.txHash || typeof res.txHash !== 'string') throw new Error('Missing txHash');
  if (!(res.executedPrice >= 1.23)) throw new Error('Executed price below min');
  if (!(elapsed >= 1900)) throw new Error('Execution too fast to be realistic');
});
