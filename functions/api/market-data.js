/**
 * Cloudflare Pages Function: /api/market-data
 * Proxies Yahoo Finance data (avoids CORS + keeps API calls server-side).
 * Accepts: POST { ticker, provider, portfolio_value }
 * Returns: Same JSON schema as the old Flask /api/analyze endpoint.
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { ticker, provider = 'yfinance', portfolio_value = 5000 } = body;
  if (!ticker) return json({ error: 'ticker required' }, 400);

  // Route to appropriate provider
  if (provider === 'alphavantage') {
    return handleAlphaVantage(ticker, portfolio_value, env);
  }
  return handleYahooFinance(ticker, portfolio_value);
}

// ── Yahoo Finance ─────────────────────────────────────────────────────────────

async function handleYahooFinance(ticker, portfolioValue) {
  const sym = encodeURIComponent(ticker.toUpperCase());

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://finance.yahoo.com',
    'Referer': 'https://finance.yahoo.com/',
  };

  // v7 quote: real-time price + basic metrics (no cookie/crumb needed)
  const quoteUrl = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${sym}&fields=regularMarketPrice,trailingPE,priceToBook,marketCap,beta,trailingAnnualDividendYield,fiftyTwoWeekHigh,fiftyTwoWeekLow,sector`;
  // v8 chart: historical OHLCV (stable endpoint)
  const now = Math.floor(Date.now() / 1000);
  const period1 = now - 90 * 86400;
  const histUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?period1=${period1}&period2=${now}&interval=1d`;
  // v11 quoteSummary: supplemental financial data (may fail, that's ok)
  const finUrl = `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${sym}?modules=financialData,defaultKeyStatistics`;

  const [quoteResp, histResp, finResp] = await Promise.all([
    fetch(quoteUrl, { headers }),
    fetch(histUrl, { headers }),
    fetch(finUrl, { headers }).catch(() => null),
  ]);

  if (!quoteResp.ok) return json({ error: `Yahoo Finance quote error: ${quoteResp.status}` }, 502);
  if (!histResp.ok) return json({ error: `Yahoo Finance history error: ${histResp.status}` }, 502);

  const quoteData = await quoteResp.json();
  const histData = await histResp.json();
  const finData = (finResp?.ok) ? await finResp.json().catch(() => null) : null;

  const result = parseYahooData(ticker, quoteData, histData, finData, portfolioValue);
  return json(result);
}

function parseYahooData(ticker, quoteData, histData, finData, portfolioValue) {
  // v7 quote response
  const q = quoteData?.quoteResponse?.result?.[0] || {};
  const currentPrice = q.regularMarketPrice || 0;
  const beta = q.beta || 1.0;
  const pe = q.trailingPE || null;
  const pb = q.priceToBook || null;
  const divYield = q.trailingAnnualDividendYield || 0;
  const mktCap = q.marketCap || null;

  // Optional: v11 financialData supplement
  const fin = finData?.quoteSummary?.result?.[0] || {};
  const fd = fin.financialData || {};
  const ks = fin.defaultKeyStatistics || {};
  const profitMargin = fd.profitMargins?.raw || null;
  const revenueGrowth = fd.revenueGrowth?.raw || null;
  const debtToEquity = fd.debtToEquity?.raw ? fd.debtToEquity.raw / 100 : null;
  const freeCashFlow = fd.freeCashflow?.raw || null;

  // RSI from history
  const chart = histData?.chart?.result?.[0];
  const closes = chart?.indicators?.quote?.[0]?.close || [];
  const timestamps = chart?.timestamp || [];

  const rsi14 = computeRSI(closes, 14);
  const sma20 = computeSMA(closes, 20);
  const sma50 = computeSMA(closes, 50);
  const sma200 = computeSMA(closes, 200);
  const high52 = closes.length ? Math.max(...closes.slice(-252)) : (q.fiftyTwoWeekHigh || currentPrice);
  const low52 = closes.length ? Math.min(...closes.slice(-252)) : (q.fiftyTwoWeekLow || currentPrice);

  // Simple agent-style scoring (deterministic, no LLMs)
  const signals = computeAgentSignals({
    currentPrice, pe, pb, profitMargin, revenueGrowth, debtToEquity,
    freeCashFlow, beta, divYield, rsi14, sma20, sma50, sma200, high52, low52
  });

  const consensus = computeConsensus(signals);
  const risk = computeRisk({ beta, pe, profitMargin, debtToEquity, freeCashFlow, rsi14, signals });
  const decision = computeDecision(consensus, risk, currentPrice, portfolioValue, ticker);

  const priceHistory30 = closes.slice(-30).map((c, i) => ({
    date: new Date(timestamps.slice(-30)[i] * 1000).toISOString().slice(0, 10),
    close: c,
  }));

  return {
    ticker,
    decision,
    market_data: {
      current_price: currentPrice,
      beta,
      pe_ratio: pe,
      pb_ratio: pb,
      profit_margin: profitMargin,
      revenue_growth: revenueGrowth,
      debt_to_equity: debtToEquity,
      free_cash_flow: freeCashFlow,
      dividend_yield: divYield,
      market_cap: mktCap,
      rsi_14: rsi14,
      sma_20: sma20,
      sma_50: sma50,
      sma_200: sma200,
      week_52_high: high52,
      week_52_low: low52,
      sector: q.sector || fin.price?.sector || 'Unknown',
    },
    price_history: priceHistory30,
    investor_signals: signals.investors,
    analyst_signals: signals.analysts,
    risk,
    consensus,
    provider: 'yfinance',
  };
}

// ── Alpha Vantage ──────────────────────────────────────────────────────────────

async function handleAlphaVantage(ticker, portfolioValue, env) {
  const apiKey = env.ALPHA_VANTAGE_API_KEY || 'RS4FY2HB5XM8FL6B';
  const base = 'https://www.alphavantage.co/query';
  const sym = ticker.toUpperCase();

  const [quoteResp, overviewResp, dailyResp] = await Promise.all([
    fetch(`${base}?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${apiKey}`),
    fetch(`${base}?function=OVERVIEW&symbol=${sym}&apikey=${apiKey}`),
    fetch(`${base}?function=TIME_SERIES_DAILY&symbol=${sym}&outputsize=compact&apikey=${apiKey}`),
  ]);

  const [quote, overview, daily] = await Promise.all([
    quoteResp.json(),
    overviewResp.json(),
    dailyResp.json(),
  ]);

  const gq = quote['Global Quote'] || {};
  const currentPrice = parseFloat(gq['05. price']) || 0;
  const pe = parseFloat(overview.PERatio) || null;
  const pb = parseFloat(overview.PriceToBookRatio) || null;
  const beta = parseFloat(overview.Beta) || 1.0;
  const profitMargin = parseFloat(overview.ProfitMargin) || null;
  const revenueGrowth = null; // Alpha Vantage doesn't give this directly
  const debtToEquity = parseFloat(overview.DebtToEquityRatio) || null;
  const freeCashFlow = null;
  const divYield = parseFloat(overview.DividendYield) || 0;
  const mktCap = parseFloat(overview.MarketCapitalization) || null;

  // Parse daily prices
  const ts = daily['Time Series (Daily)'] || {};
  const dates = Object.keys(ts).sort().reverse();
  const closes = dates.map(d => parseFloat(ts[d]['4. close']));

  const rsi14 = computeRSI(closes, 14);
  const sma20 = computeSMA(closes, 20);
  const sma50 = computeSMA(closes, 50);
  const sma200 = computeSMA(closes, 200);
  const high52 = closes.length ? Math.max(...closes.slice(0, 252)) : currentPrice;
  const low52 = closes.length ? Math.min(...closes.slice(0, 252)) : currentPrice;

  const signals = computeAgentSignals({
    currentPrice, pe, pb, profitMargin, revenueGrowth, debtToEquity,
    freeCashFlow, beta, divYield, rsi14, sma20, sma50, sma200, high52, low52
  });

  const consensus = computeConsensus(signals);
  const risk = computeRisk({ beta, pe, profitMargin, debtToEquity, freeCashFlow, rsi14, signals });
  const decision = computeDecision(consensus, risk, currentPrice, portfolioValue, ticker);

  const priceHistory30 = dates.slice(0, 30).reverse().map((d, i) => ({
    date: d,
    close: closes[29 - i],
  }));

  return {
    ticker,
    decision,
    market_data: {
      current_price: currentPrice,
      beta,
      pe_ratio: pe,
      pb_ratio: pb,
      profit_margin: profitMargin,
      revenue_growth: revenueGrowth,
      debt_to_equity: debtToEquity,
      free_cash_flow: freeCashFlow,
      dividend_yield: divYield,
      market_cap: mktCap,
      rsi_14: rsi14,
      sma_20: sma20,
      sma_50: sma50,
      sma_200: sma200,
      week_52_high: high52,
      week_52_low: low52,
      sector: overview.Sector || 'Unknown',
    },
    price_history: priceHistory30,
    investor_signals: signals.investors,
    analyst_signals: signals.analysts,
    risk,
    consensus,
    provider: 'alphavantage',
  };
}

// ── Quantitative Helpers ───────────────────────────────────────────────────────

function computeRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function computeSMA(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function computeAgentSignals({ currentPrice, pe, pb, profitMargin, revenueGrowth, debtToEquity, freeCashFlow, beta, divYield, rsi14, sma20, sma50, sma200, high52, low52 }) {
  const score = (s) => Math.max(-100, Math.min(100, s));
  const fmt = (s, label) => {
    const clamped = score(s);
    const sentiment = clamped > 15 ? 'bullish' : clamped < -15 ? 'bearish' : 'neutral';
    return { name: label, score: clamped, sentiment, reasoning: `Score: ${clamped.toFixed(0)}` };
  };

  // Buffett: quality compounder
  let buffett = 0;
  if (profitMargin > 0.20) buffett += 20;
  if (pe && pe < 25 && pe > 0) buffett += 15;
  if (pb && pb < 3) buffett += 10;
  if (debtToEquity && debtToEquity < 0.5) buffett += 15;
  if (freeCashFlow > 0) buffett += 10;
  if (pe && pe > 40) buffett -= 20;

  // Graham: deep value
  let graham = 0;
  if (pe && pe < 15 && pe > 0) graham += 25;
  if (pb && pb < 1.5) graham += 25;
  if (debtToEquity && debtToEquity < 0.5) graham += 20;
  if (profitMargin > 0) graham += 10;
  if (pe && pe > 20) graham -= 20;

  // Munger: wonderful businesses
  let munger = 0;
  if (profitMargin > 0.25) munger += 25;
  if (pe && pe > 10 && pe < 25) munger += 15;
  if (revenueGrowth > 0.10) munger += 15;
  if (debtToEquity && debtToEquity < 0.3) munger += 15;

  // Druckenmiller: momentum + macro
  let druck = 0;
  if (sma50 && sma200 && sma50 > sma200) druck += 30; // golden cross
  if (rsi14 < 35) druck += 25;  // oversold entry
  if (rsi14 > 70) druck -= 20;

  // Wood: growth
  let wood = 0;
  if (revenueGrowth > 0.30) wood += 40;
  else if (revenueGrowth > 0.15) wood += 20;
  if (pe && pe > 50) wood += 10; // high PE OK for growth
  if (profitMargin < 0) wood -= 10;

  // Burry: contrarian value
  let burry = 0;
  if (pe && pe < 8 && pe > 0) burry += 30;
  if (pb && pb < 1.0) burry += 30;
  const range = high52 - low52;
  if (range > 0 && (currentPrice - low52) / range < 0.25) burry += 20;
  if (pe && pe > 20) burry -= 30;

  // Lynch: GARP
  let lynch = 0;
  // PEG ~ PE / (revGrowth * 100)
  if (pe && revenueGrowth > 0) {
    const peg = pe / (revenueGrowth * 100);
    if (peg < 1.0) lynch += 40;
    else if (peg < 2.0) lynch += 15;
    else lynch -= 20;
  }

  // Ackman: activist / cash flow
  let ackman = 0;
  if (freeCashFlow > 0 && currentPrice > 0) {
    const fcfYield = freeCashFlow / (currentPrice * 1e9) * 100;
    if (fcfYield > 6) ackman += 30;
    else if (fcfYield > 3) ackman += 15;
  }
  if (profitMargin > 0.20) ackman += 20;

  // Fisher: long-term growth
  let fisher = 0;
  if (revenueGrowth > 0.15) fisher += 30;
  if (profitMargin > 0.10) fisher += 20;

  // Pabrai: asymmetric bets
  let pabrai = 0;
  if (pb && pb < 1.5) pabrai += 25;
  if (debtToEquity && debtToEquity < 0.5) pabrai += 25;
  if (freeCashFlow > 0) pabrai += 20;

  // Damodaran: valuation
  let damod = 0;
  if (freeCashFlow > 0 && currentPrice > 0) {
    const fcfYield = freeCashFlow / (currentPrice * 1e8);
    if (fcfYield > 0.04) damod += 25;
  }
  if (pe && pe < 20 && pe > 0) damod += 20;
  if (revenueGrowth > 0) damod += 10;

  // Jhunjhunwala: structural growth
  let jhunj = 0;
  if (revenueGrowth > 0.20) jhunj += 30;
  if (pe && pe < 20 && pe > 0) jhunj += 20;
  if (profitMargin > 0.12) jhunj += 20;

  // Analyst signals
  // Valuation
  let valuation = 0;
  if (pe && pe < 15) valuation += 30; else if (pe && pe > 40) valuation -= 30;
  if (pb && pb < 2) valuation += 20; else if (pb && pb > 5) valuation -= 20;

  // Sentiment
  let sentiment = 0;
  if (rsi14 < 30) sentiment += 40;
  else if (rsi14 > 70) sentiment -= 40;
  if (sma50 && sma200) {
    if (currentPrice > sma50) sentiment += 15;
    if (sma50 > sma200) sentiment += 15;
  }

  // Fundamentals
  let fundamentals = 0;
  if (profitMargin > 0.15) fundamentals += 25;
  if (revenueGrowth > 0.10) fundamentals += 25;
  if (debtToEquity && debtToEquity < 0.5) fundamentals += 20;
  if (freeCashFlow > 0) fundamentals += 20;
  if (profitMargin < 0) fundamentals -= 30;

  // Technicals
  let technicals = 0;
  if (sma50 && sma200 && sma50 > sma200) technicals += 30;
  if (rsi14 > 50) technicals += 10; else technicals -= 10;
  if (currentPrice > (sma20 || currentPrice)) technicals += 15;

  return {
    investors: [
      fmt(buffett, 'Warren Buffett'),
      fmt(graham, 'Ben Graham'),
      fmt(munger, 'Charlie Munger'),
      fmt(damod, 'Aswath Damodaran'),
      fmt(burry, 'Michael Burry'),
      fmt(ackman, 'Bill Ackman'),
      fmt(wood, 'Cathie Wood'),
      fmt(lynch, 'Peter Lynch'),
      fmt(fisher, 'Phil Fisher'),
      fmt(pabrai, 'Mohnish Pabrai'),
      fmt(jhunj, 'Rakesh Jhunjhunwala'),
      fmt(druck, 'Stanley Druckenmiller'),
    ],
    analysts: [
      fmt(valuation, 'Valuation Analyst'),
      fmt(sentiment, 'Sentiment Analyst'),
      fmt(fundamentals, 'Fundamentals Analyst'),
      fmt(technicals, 'Technicals Analyst'),
    ],
  };
}

function computeConsensus(signals) {
  const all = [...signals.investors, ...signals.analysts];
  let bullish = 0, bearish = 0, neutral = 0;
  for (const s of all) {
    if (s.sentiment === 'bullish') bullish++;
    else if (s.sentiment === 'bearish') bearish++;
    else neutral++;
  }
  return { bullish, bearish, neutral, total: all.length };
}

function computeRisk({ beta, pe, profitMargin, debtToEquity, freeCashFlow, rsi14, signals }) {
  let riskScore = 0;
  const warnings = [];

  if (beta > 2.0) { riskScore += 2; warnings.push('Very high beta (> 2.0)'); }
  else if (beta > 1.5) { riskScore += 1; warnings.push('High beta'); }

  if (pe && pe > 60) { riskScore += 2; warnings.push('Extreme valuation (P/E > 60)'); }
  else if (pe && pe > 40) { riskScore += 1; warnings.push('Elevated valuation'); }

  if (debtToEquity && debtToEquity > 2) { riskScore += 2; warnings.push('Very high leverage'); }
  else if (debtToEquity && debtToEquity > 1) { riskScore += 1; warnings.push('High leverage'); }

  if (freeCashFlow < 0) { riskScore += 1; warnings.push('Negative free cash flow'); }
  if (profitMargin < 0) { riskScore += 1; warnings.push('Negative profit margin'); }
  if (rsi14 > 80) { riskScore += 1; warnings.push('Overbought RSI'); }
  if (rsi14 < 20) { riskScore += 1; warnings.push('Heavily oversold RSI'); }

  const all = [...(signals?.investors || []), ...(signals?.analysts || [])];
  const bullish = all.filter(s => s.sentiment === 'bullish').length;
  const bearish = all.filter(s => s.sentiment === 'bearish').length;
  if (Math.abs(bullish - bearish) < 3) { riskScore += 1; warnings.push('High signal disagreement'); }

  riskScore = Math.min(10, Math.max(0, riskScore));
  const maxPosition = Math.max(1, 10 - riskScore);
  const var95 = beta * 0.05 * 1.645 * 100;

  return { risk_score: riskScore, max_position_pct: maxPosition, var_95: var95, warnings };
}

function computeDecision(consensus, risk, price, portfolioValue, ticker) {
  const { bullish, bearish, total } = consensus;
  const bullPct = bullish / total;
  const bearPct = bearish / total;

  let action = 'HOLD';
  let conviction = 'low';
  if (bullPct > 0.55) { action = 'BUY'; conviction = bullPct > 0.70 ? 'high' : 'medium'; }
  else if (bearPct > 0.55) { action = 'SELL'; conviction = bearPct > 0.70 ? 'high' : 'medium'; }

  if (risk.risk_score >= 8 && action === 'BUY') { action = 'HOLD'; conviction = 'low'; }

  const convMultiplier = conviction === 'high' ? 1.0 : conviction === 'medium' ? 0.6 : 0.3;
  const positionValue = portfolioValue * (risk.max_position_pct / 100) * convMultiplier;
  const quantity = price > 0 ? Math.floor(positionValue / price) : 0;

  return { action, conviction, quantity, ticker };
}

// ── Batch endpoint ─────────────────────────────────────────────────────────────

export async function onRequestGet() {
  return json({ status: 'ok', endpoint: '/api/market-data' });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
