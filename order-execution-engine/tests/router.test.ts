import { chooseBestQuote } from '../src/utils/router.js';
import { test } from './run-tests.js';

test('chooseBestQuote returns highest price', () => {
  const best = chooseBestQuote([
    { venue: 'Raydium', price: 1.1 },
    { venue: 'Meteora', price: 1.3 },
    { venue: 'Other', price: 1.2 },
  ]);
  if (!best) throw new Error('Expected a best quote');
  if (best.venue !== 'Meteora') throw new Error('Expected Meteora');
});

test('chooseBestQuote handles empty list', () => {
  const best = chooseBestQuote([]);
  if (best !== null) throw new Error('Expected null');
});

test('chooseBestQuote returns last highest on tie', () => {
  const best = chooseBestQuote([
    { venue: 'A', price: 1.2 },
    { venue: 'B', price: 1.2 },
  ]);
  if (!best) throw new Error('Expected best');
  if (best.venue !== 'B') throw new Error('Expected B');
});
