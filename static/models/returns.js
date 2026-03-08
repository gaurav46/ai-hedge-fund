/**
 * Core Returns — JavaScript implementations
 * All functions work on plain arrays of numbers.
 */

/** Simple arithmetic return: (P_t - P_{t-1} + D_t) / P_{t-1} */
export function simpleReturn(priceCurrent, pricePrev, dividend = 0) {
  if (pricePrev === 0) return null;
  return (priceCurrent - pricePrev + dividend) / pricePrev;
}

/** Log return: ln(P_t / P_{t-1}) */
export function logReturn(priceCurrent, pricePrev) {
  if (pricePrev <= 0 || priceCurrent <= 0) return null;
  return Math.log(priceCurrent / pricePrev);
}

/** Series of simple returns from price array */
export function simpleReturnSeries(prices, dividends = null) {
  const rets = [];
  for (let i = 1; i < prices.length; i++) {
    const d = dividends ? (dividends[i] || 0) : 0;
    rets.push(simpleReturn(prices[i], prices[i - 1], d));
  }
  return rets;
}

/** Series of log returns from price array */
export function logReturnSeries(prices) {
  const rets = [];
  for (let i = 1; i < prices.length; i++) {
    rets.push(logReturn(prices[i], prices[i - 1]));
  }
  return rets;
}

/** Cumulative return: ∏(1+R_t) - 1 */
export function cumulativeReturn(returns) {
  return returns.reduce((acc, r) => acc * (1 + r), 1) - 1;
}

/** Cumulative return series (equity curve) */
export function cumulativeReturnSeries(returns) {
  const curve = [1];
  for (const r of returns) curve.push(curve[curve.length - 1] * (1 + r));
  return curve.slice(1);
}

/** Excess return: R_t - R_f (risk-free) */
export function excessReturn(assetReturn, riskFreeRate) {
  return assetReturn - riskFreeRate;
}

/** Portfolio return: w ⊤ R (dot product of weights and returns) */
export function portfolioReturn(weights, returns) {
  if (weights.length !== returns.length) throw new Error('Dimension mismatch');
  return weights.reduce((sum, w, i) => sum + w * returns[i], 0);
}

/** Annualize a return given periods per year */
export function annualizeReturn(periodicReturn, periodsPerYear = 252) {
  return Math.pow(1 + periodicReturn, periodsPerYear) - 1;
}

/** CAGR: (end/start)^(1/years) - 1 */
export function cagr(startValue, endValue, years) {
  if (startValue <= 0 || years <= 0) return null;
  return Math.pow(endValue / startValue, 1 / years) - 1;
}

/** Holding period return from price series */
export function holdingPeriodReturn(prices) {
  if (prices.length < 2) return 0;
  return (prices[prices.length - 1] - prices[0]) / prices[0];
}

/** Convert simple return to log return */
export function simpleToLog(r) { return Math.log(1 + r); }

/** Convert log return to simple return */
export function logToSimple(r) { return Math.exp(r) - 1; }
