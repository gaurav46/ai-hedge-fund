/**
 * Core Statistics — JavaScript implementations
 */

export function mean(arr) {
  if (!arr.length) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function variance(arr, ddof = 1) {
  if (arr.length <= ddof) return NaN;
  const mu = mean(arr);
  const ss = arr.reduce((s, x) => s + (x - mu) ** 2, 0);
  return ss / (arr.length - ddof);
}

export function stdDev(arr, ddof = 1) {
  return Math.sqrt(variance(arr, ddof));
}

export function covariance(x, y, ddof = 1) {
  if (x.length !== y.length || x.length <= ddof) return NaN;
  const mx = mean(x), my = mean(y);
  const ss = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0);
  return ss / (x.length - ddof);
}

export function correlation(x, y) {
  const cov = covariance(x, y);
  const sx = stdDev(x), sy = stdDev(y);
  if (sx === 0 || sy === 0) return NaN;
  return cov / (sx * sy);
}

export function zScore(x, mu, sigma) {
  if (sigma === 0) return 0;
  return (x - mu) / sigma;
}

export function zScoreSeries(arr) {
  const mu = mean(arr), sigma = stdDev(arr);
  return arr.map(x => zScore(x, mu, sigma));
}

export function skewness(arr) {
  const n = arr.length, mu = mean(arr), sigma = stdDev(arr);
  if (sigma === 0) return 0;
  const s = arr.reduce((acc, x) => acc + ((x - mu) / sigma) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * s;
}

export function kurtosis(arr) {
  const n = arr.length, mu = mean(arr), sigma = stdDev(arr);
  if (sigma === 0) return 0;
  const s = arr.reduce((acc, x) => acc + ((x - mu) / sigma) ** 4, 0);
  return (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) * s
    - 3 * (n - 1) ** 2 / ((n - 2) * (n - 3));  // excess kurtosis
}

/** OLS regression: returns { beta, alpha, rSquared, residuals }
 *  y = alpha + beta * x  (simple) or y = X * beta (matrix form)
 *  Simple form only here (use mathjs for multivariate) */
export function olsSimple(x, y) {
  const mx = mean(x), my = mean(y);
  const cov = covariance(x, y);
  const vx = variance(x);
  const beta = cov / vx;
  const alpha = my - beta * mx;
  const residuals = y.map((yi, i) => yi - (alpha + beta * x[i]));
  const ssRes = residuals.reduce((s, r) => s + r * r, 0);
  const ssTot = y.reduce((s, yi) => s + (yi - my) ** 2, 0);
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { beta, alpha, rSquared, residuals };
}

/** Percentile (linear interpolation) */
export function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = p / 100 * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

/** Rolling window computation */
export function rolling(arr, window, fn) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < window - 1) out.push(NaN);
    else out.push(fn(arr.slice(i - window + 1, i + 1)));
  }
  return out;
}

/** Exponentially weighted mean (EWMA weight = λ for last obs) */
export function ewmMean(arr, halfLife) {
  const lam = Math.pow(0.5, 1 / halfLife);
  let sum = 0, wsum = 0;
  let w = 1;
  for (let i = arr.length - 1; i >= 0; i--) {
    sum += w * arr[i];
    wsum += w;
    w *= lam;
  }
  return sum / wsum;
}

/** Normal CDF via approximation */
export function normCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

/** Normal PDF */
export function normPDF(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/** Inverse normal CDF (rational approximation, Beasley-Springer-Moro) */
export function normInvCDF(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [0, -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [0, -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let x;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    const q = p - 0.5, r = q * q;
    x = (((((a[1] * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * r + a[6]) * q /
      (((((b[1] * r + b[2]) * r + b[3]) * r + b[4]) * r + b[5]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  return x;
}
