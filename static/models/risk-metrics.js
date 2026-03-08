/**
 * Risk & Performance Metrics — JavaScript implementations
 */
import { mean, stdDev, percentile, normInvCDF, variance } from './statistics.js';

/** Volatility (annualized) */
export function annualizedVol(returns, periodsPerYear = 252) {
  return stdDev(returns) * Math.sqrt(periodsPerYear);
}

/** Sharpe Ratio: E[R_p - R_f] / σ_p */
export function sharpeRatio(returns, riskFreeRate = 0, periodsPerYear = 252) {
  const excessMean = mean(returns) - riskFreeRate / periodsPerYear;
  const vol = stdDev(returns);
  if (vol === 0) return 0;
  return (excessMean / vol) * Math.sqrt(periodsPerYear);
}

/** Sortino Ratio: uses downside deviation */
export function sortinoRatio(returns, targetReturn = 0, periodsPerYear = 252) {
  const excessMean = mean(returns) - targetReturn / periodsPerYear;
  const downside = returns.filter(r => r < targetReturn / periodsPerYear);
  if (downside.length === 0) return Infinity;
  const downsideDev = Math.sqrt(downside.reduce((s, r) => s + (r - targetReturn / periodsPerYear) ** 2, 0) / returns.length);
  if (downsideDev === 0) return Infinity;
  return (excessMean / downsideDev) * Math.sqrt(periodsPerYear);
}

/** Information Ratio vs benchmark */
export function informationRatio(portfolioReturns, benchmarkReturns, periodsPerYear = 252) {
  if (portfolioReturns.length !== benchmarkReturns.length) return NaN;
  const active = portfolioReturns.map((r, i) => r - benchmarkReturns[i]);
  const activeMean = mean(active);
  const te = stdDev(active) * Math.sqrt(periodsPerYear);
  if (te === 0) return 0;
  return activeMean * periodsPerYear / te;
}

/** Tracking Error (annualized) */
export function trackingError(portfolioReturns, benchmarkReturns, periodsPerYear = 252) {
  const active = portfolioReturns.map((r, i) => r - benchmarkReturns[i]);
  return stdDev(active) * Math.sqrt(periodsPerYear);
}

/** Maximum Drawdown and peak/trough indices */
export function maxDrawdown(cumReturns) {
  let peak = cumReturns[0];
  let peakIdx = 0;
  let maxDD = 0;
  let troughIdx = 0;
  let ddStart = 0;

  for (let i = 1; i < cumReturns.length; i++) {
    if (cumReturns[i] > peak) { peak = cumReturns[i]; peakIdx = i; }
    const dd = (peak - cumReturns[i]) / peak;
    if (dd > maxDD) { maxDD = dd; troughIdx = i; ddStart = peakIdx; }
  }
  return { maxDrawdown: maxDD, peakIdx: ddStart, troughIdx };
}

/** Calmar Ratio: annualized return / max drawdown */
export function calmarRatio(annualReturn, maxDD) {
  if (maxDD === 0) return Infinity;
  return annualReturn / maxDD;
}

/** Beta of asset vs market */
export function beta(assetReturns, marketReturns) {
  if (assetReturns.length !== marketReturns.length) return NaN;
  const cov = assetReturns.reduce((s, r, i) => {
    return s + (r - mean(assetReturns)) * (marketReturns[i] - mean(marketReturns));
  }, 0) / (assetReturns.length - 1);
  const mktVar = variance(marketReturns);
  if (mktVar === 0) return NaN;
  return cov / mktVar;
}

/** Jensen's Alpha */
export function jensensAlpha(portfolioReturn, riskFreeRate, betaVal, marketReturn) {
  return portfolioReturn - (riskFreeRate + betaVal * (marketReturn - riskFreeRate));
}

// ── Value at Risk ──────────────────────────────────────────────────────────────

/** Parametric VaR assuming normal distribution */
export function parametricVaR(mu, sigma, confidence = 0.95, horizon = 1) {
  const z = normInvCDF(1 - confidence);
  return -(mu * horizon + z * sigma * Math.sqrt(horizon));
}

/** Historical VaR (non-parametric) */
export function historicalVaR(returns, confidence = 0.95) {
  return -percentile(returns, (1 - confidence) * 100);
}

/** Monte Carlo VaR */
export function monteCarloVaR(mu, sigma, confidence = 0.95, horizon = 1, nSims = 10000) {
  const z = normInvCDF(1 - confidence);
  // Exact for normal: same as parametric
  return parametricVaR(mu, sigma, confidence, horizon);
}

/** Expected Shortfall (CVaR): E[L | L > VaR_α] */
export function expectedShortfall(returns, confidence = 0.95) {
  const sorted = [...returns].sort((a, b) => a - b);
  const cutoff = Math.floor((1 - confidence) * sorted.length);
  const tail = sorted.slice(0, cutoff);
  if (tail.length === 0) return -sorted[0];
  return -mean(tail);
}

/** Parametric ES for normal distribution */
export function parametricES(mu, sigma, confidence = 0.95) {
  const z = normInvCDF(1 - confidence);
  const phi = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z);
  return -(mu + sigma * (-phi / (1 - confidence)));
}

/** Cornish-Fisher VaR adjustment for skewness/kurtosis */
export function cornishFisherVaR(returns, confidence = 0.95) {
  const mu = mean(returns);
  const sigma = stdDev(returns);
  const sk = skewnessOf(returns);
  const ku = excessKurtosisOf(returns);
  const z = normInvCDF(1 - confidence);
  // Cornish-Fisher expansion
  const zCF = z + (z ** 2 - 1) * sk / 6 + (z ** 3 - 3 * z) * ku / 24
    - (2 * z ** 3 - 5 * z) * sk ** 2 / 36;
  return -(mu + sigma * zCF);
}

function skewnessOf(arr) {
  const n = arr.length, mu = mean(arr), sigma = stdDev(arr);
  if (sigma === 0) return 0;
  return arr.reduce((acc, x) => acc + ((x - mu) / sigma) ** 3, 0) / n;
}

function excessKurtosisOf(arr) {
  const n = arr.length, mu = mean(arr), sigma = stdDev(arr);
  if (sigma === 0) return 0;
  return arr.reduce((acc, x) => acc + ((x - mu) / sigma) ** 4, 0) / n - 3;
}

// ── CAPM & Factor Models ───────────────────────────────────────────────────────

/** CAPM expected return: R_f + β(E[R_m] - R_f) */
export function capmExpectedReturn(riskFree, betaVal, marketReturn) {
  return riskFree + betaVal * (marketReturn - riskFree);
}

/** Portfolio beta from weights and individual betas */
export function portfolioBeta(weights, betas) {
  return weights.reduce((s, w, i) => s + w * betas[i], 0);
}

// ── Portfolio Risk ─────────────────────────────────────────────────────────────

/** Portfolio variance: w' Σ w */
export function portfolioVariance(weights, covMatrix) {
  const n = weights.length;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  return variance;
}

/** Portfolio volatility */
export function portfolioVolatility(weights, covMatrix) {
  return Math.sqrt(portfolioVariance(weights, covMatrix));
}

/** Sharpe ratio for given weights */
export function portfolioSharpe(weights, expectedReturns, covMatrix, riskFree = 0) {
  const ret = weights.reduce((s, w, i) => s + w * expectedReturns[i], 0);
  const vol = portfolioVolatility(weights, covMatrix);
  if (vol === 0) return 0;
  return (ret - riskFree) / vol;
}

/** EWMA volatility: σ²_t = λσ²_{t-1} + (1-λ)r²_{t-1} */
export function ewmaVolatility(returns, lambda = 0.94) {
  if (returns.length === 0) return 0;
  let varEWMA = returns[0] ** 2;
  for (let i = 1; i < returns.length; i++) {
    varEWMA = lambda * varEWMA + (1 - lambda) * returns[i - 1] ** 2;
  }
  return Math.sqrt(varEWMA * 252);
}

/** Profit factor: gross profit / gross loss */
export function profitFactor(returns) {
  const profits = returns.filter(r => r > 0).reduce((s, r) => s + r, 0);
  const losses = Math.abs(returns.filter(r => r < 0).reduce((s, r) => s + r, 0));
  if (losses === 0) return Infinity;
  return profits / losses;
}

/** Hit rate: winners / total trades */
export function hitRate(returns) {
  const winners = returns.filter(r => r > 0).length;
  return winners / returns.length;
}

/** Turnover: Σ|w_t - w_{t-1}| */
export function turnover(weightsHistory) {
  if (weightsHistory.length < 2) return 0;
  let total = 0;
  for (let t = 1; t < weightsHistory.length; t++) {
    for (let i = 0; i < weightsHistory[t].length; i++) {
      total += Math.abs(weightsHistory[t][i] - weightsHistory[t - 1][i]);
    }
  }
  return total / (weightsHistory.length - 1);
}
