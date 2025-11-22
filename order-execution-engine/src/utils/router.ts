export type SimpleQuote = { venue: string; price: number };

export function chooseBestQuote(quotes: SimpleQuote[]): SimpleQuote | null {
  if (!quotes.length) return null;
  return quotes.reduce((best, q) => (q.price >= best.price ? q : best), quotes[0]);
}
