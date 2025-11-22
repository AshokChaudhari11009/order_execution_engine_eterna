import { executeSchema } from '../src/utils/validation.js';
import { test } from './run-tests.js';

test('validation accepts valid payload', () => {
  const res = executeSchema.safeParse({ tokenIn: 'SOL', tokenOut: 'USDC', amountIn: 1, limitPrice: 2 });
  if (!res.success) throw new Error('Expected success');
});

test('validation rejects negative amount', () => {
  const res = executeSchema.safeParse({ tokenIn: 'SOL', tokenOut: 'USDC', amountIn: -1, limitPrice: 2 });
  if (res.success) throw new Error('Expected failure');
});

test('validation rejects missing fields', () => {
  const res = executeSchema.safeParse({ tokenIn: 'SOL', amountIn: 1 });
  if (res.success) throw new Error('Expected failure');
});
