/**
 * Cloudflare Pages Function: /api/analyze_batch
 * Analyzes multiple tickers via /api/market-data.
 */
import { onRequestPost as analyzeOne } from './market-data.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { tickers = [], portfolio_value = 5000, provider = 'yfinance' } = body;
  if (!Array.isArray(tickers) || tickers.length === 0) {
    return json({ error: 'tickers array required' }, 400);
  }
  const limited = tickers.slice(0, 10);

  const results = [];
  const errors = [];

  // Process tickers with slight stagger to avoid rate limiting
  for (const ticker of limited) {
    const syntheticReq = new Request('https://placeholder/api/market-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, provider, portfolio_value }),
    });
    try {
      const resp = await analyzeOne({ request: syntheticReq, env });
      const data = await resp.json();
      if (resp.ok) results.push(data);
      else errors.push({ ticker, error: data.error });
    } catch (e) {
      errors.push({ ticker, error: e.message });
    }
  }

  return json({ results, errors });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
