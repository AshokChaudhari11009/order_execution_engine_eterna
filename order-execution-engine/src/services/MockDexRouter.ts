import { sleep } from '../utils/sleep.js';

export type Quote = { price: number; fee: number; venue: 'Raydium' | 'Meteora' };

function randomTxHash() {
  const chars = 'abcdef0123456789';
  let s = '0x';
  for (let i = 0; i < 64; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export class MockDexRouter {
  // Determine a base price from token pair to keep it deterministic-ish
  private getBasePrice(tokenIn: string, tokenOut: string) {
    const seed = (tokenIn + tokenOut).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const base = 1 + (seed % 100) / 25; // between ~1 and 5
    return base;
  }

  async getRaydiumQuote(tokenIn: string, tokenOut: string, amountIn: number): Promise<Quote> {
    await sleep(200 + Math.random() * 200);
    const basePrice = this.getBasePrice(tokenIn, tokenOut);
    const price = basePrice * (0.98 + Math.random() * 0.04); // 2% band
    return { price, fee: 0.003, venue: 'Raydium' };
  }

  async getMeteoraQuote(tokenIn: string, tokenOut: string, amountIn: number): Promise<Quote> {
    await sleep(200 + Math.random() * 200);
    const basePrice = this.getBasePrice(tokenIn, tokenOut);
    const price = basePrice * (0.97 + Math.random() * 0.05); // 3% band
    return { price, fee: 0.002, venue: 'Meteora' };
  }

  async executeSwap(dex: 'Raydium' | 'Meteora', params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    minAcceptablePrice: number; // slippage protected min
  }): Promise<{ txHash: string; executedPrice: number }>
  {
    // simulate 2-3s execution
    await sleep(2000 + Math.random() * 1000);
    // executed price near the current route price within small slippage
    const executedPrice = params.minAcceptablePrice * (1 + Math.random() * 0.01);
    return { txHash: randomTxHash(), executedPrice };
  }
}
