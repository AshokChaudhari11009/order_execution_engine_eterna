import { z } from 'zod';

export const executeSchema = z.object({
  tokenIn: z.string().min(1),
  tokenOut: z.string().min(1),
  amountIn: z.number().positive(),
  limitPrice: z.number().positive(),
});
