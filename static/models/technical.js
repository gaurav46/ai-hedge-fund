/**
 * Technical Indicators — JavaScript implementations
 */

/** Simple Moving Average */
export function sma(prices, window) {
  return prices.map((_, i) => {
    if (i < window - 1) return null;
    const slice = prices.slice(i - window + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / window;
  });
}

/** Exponential Moving Average */
export function ema(prices, window) {
  const k = 2 / (window + 1);
  const result = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    result.push(prices[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

/** MACD: fast EMA - slow EMA + signal line */
export function macd(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = ema(prices, fastPeriod);
  const slowEMA = ema(prices, slowPeriod);
  const macdLine = fastEMA.map((f, i) => f - slowEMA[i]);
  const signalLine = ema(macdLine.slice(slowPeriod - 1), signalPeriod);
  const paddedSignal = Array(slowPeriod - 1).fill(null).concat(signalLine);
  const histogram = macdLine.map((m, i) => paddedSignal[i] !== null ? m - paddedSignal[i] : null);
  return { macdLine, signalLine: paddedSignal, histogram };
}

/** RSI: Relative Strength Index */
export function rsi(prices, period = 14) {
  const result = Array(period).fill(null);
  const gains = [], losses = [];
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    gains.push(Math.max(diff, 0));
    losses.push(Math.max(-diff, 0));
  }
  // Initial averages
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const rsiVals = [100 - 100 / (1 + avgGain / (avgLoss || 1e-10))];
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rsiVals.push(100 - 100 / (1 + avgGain / (avgLoss || 1e-10)));
  }
  return result.concat(rsiVals);
}

/** Bollinger Bands: MA ± k*σ */
export function bollingerBands(prices, window = 20, k = 2) {
  const middle = sma(prices, window);
  const upper = [], lower = [], width = [], pctB = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < window - 1) {
      upper.push(null); lower.push(null); width.push(null); pctB.push(null);
    } else {
      const slice = prices.slice(i - window + 1, i + 1);
      const mu = middle[i];
      const sigma = Math.sqrt(slice.reduce((s, p) => s + (p - mu) ** 2, 0) / window);
      upper.push(mu + k * sigma);
      lower.push(mu - k * sigma);
      width.push(2 * k * sigma / mu);
      pctB.push((prices[i] - (mu - k * sigma)) / (2 * k * sigma));
    }
  }
  return { upper, middle, lower, width, pctB };
}

/** Average True Range */
export function atr(highs, lows, closes, period = 14) {
  const trueRange = closes.map((c, i) => {
    if (i === 0) return highs[i] - lows[i];
    return Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
  });
  const result = [null];
  let atrVal = trueRange.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(atrVal);
  for (let i = period; i < trueRange.length; i++) {
    atrVal = (atrVal * (period - 1) + trueRange[i]) / period;
    result.push(atrVal);
  }
  return result;
}

/** Stochastic Oscillator %K */
export function stochasticOscillator(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
  const kLine = closes.map((c, i) => {
    if (i < kPeriod - 1) return null;
    const highSlice = highs.slice(i - kPeriod + 1, i + 1);
    const lowSlice = lows.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...highSlice);
    const lowestLow = Math.min(...lowSlice);
    if (highestHigh === lowestLow) return 50;
    return ((c - lowestLow) / (highestHigh - lowestLow)) * 100;
  });
  // D-line: SMA of K
  const dLine = sma(kLine.filter(x => x !== null), dPeriod);
  return { kLine, dLine };
}

/** VWAP: Σ(price*volume) / Σvolume */
export function vwap(prices, volumes) {
  let cumPV = 0, cumV = 0;
  return prices.map((p, i) => {
    cumPV += p * volumes[i];
    cumV += volumes[i];
    return cumV > 0 ? cumPV / cumV : p;
  });
}

/** TWAP: evenly-weighted average over time */
export function twap(prices) {
  const sum = prices.reduce((a, b) => a + b, 0);
  return sum / prices.length;
}

/** ADX: Average Directional Index */
export function adx(highs, lows, closes, period = 14) {
  const n = closes.length;
  const plusDM = [], minusDM = [], trueRange = [];

  for (let i = 1; i < n; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trueRange.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }

  // Smoothed values (Wilder)
  let smoothedTR = trueRange.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedPDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedMDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

  const adxValues = [];
  let prevADX = null;
  for (let i = period; i < n - 1; i++) {
    smoothedTR = smoothedTR - smoothedTR / period + trueRange[i];
    smoothedPDM = smoothedPDM - smoothedPDM / period + plusDM[i];
    smoothedMDM = smoothedMDM - smoothedMDM / period + minusDM[i];

    const plusDI = (smoothedPDM / smoothedTR) * 100;
    const minusDI = (smoothedMDM / smoothedTR) * 100;
    const DX = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;

    if (prevADX === null) { prevADX = DX; } else {
      prevADX = (prevADX * (period - 1) + DX) / period;
    }
    adxValues.push(prevADX);
  }
  return adxValues;
}

/** Order book imbalance: (V_bid - V_ask) / (V_bid + V_ask) */
export function orderBookImbalance(bidVolume, askVolume) {
  const total = bidVolume + askVolume;
  if (total === 0) return 0;
  return (bidVolume - askVolume) / total;
}

/** Kyle Lambda (price impact): ΔP = λQ + ε, estimated via OLS on trade data */
export function kyleLambda(priceChanges, signedVolumes) {
  if (priceChanges.length !== signedVolumes.length) throw new Error('Dimension mismatch');
  const n = priceChanges.length;
  const sumXY = priceChanges.reduce((s, dp, i) => s + signedVolumes[i] * dp, 0);
  const sumX2 = signedVolumes.reduce((s, q) => s + q ** 2, 0);
  return sumX2 > 0 ? sumXY / sumX2 : 0;
}
