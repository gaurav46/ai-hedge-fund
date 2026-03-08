/**
 * Portfolio Theory — JavaScript implementations
 * Uses scipy-style optimization through iterative methods where needed.
 */
import { mean, variance, stdDev } from './statistics.js';

/** Portfolio return: w ⊤ μ */
export function portfolioReturn(weights, expectedReturns) {
  return weights.reduce((s, w, i) => s + w * expectedReturns[i], 0);
}

/** Portfolio variance: w ⊤ Σ w */
export function portfolioVariance(weights, covMatrix) {
  const n = weights.length;
  let v = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      v += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  return v;
}

/** Portfolio volatility */
export function portfolioVol(weights, covMatrix) {
  return Math.sqrt(portfolioVariance(weights, covMatrix));
}

/** Equal-weight portfolio */
export function equalWeights(n) {
  return Array(n).fill(1 / n);
}

/** Global Minimum Variance (analytical for 2 assets) */
export function gmv2Asset(sigma1, sigma2, rho12) {
  const cov12 = rho12 * sigma1 * sigma2;
  const w1 = (sigma2 ** 2 - cov12) / (sigma1 ** 2 + sigma2 ** 2 - 2 * cov12);
  return [Math.max(0, Math.min(1, w1)), Math.max(0, Math.min(1, 1 - w1))];
}

/** Gradient-descent based MVO (no external solver).
 *  Minimizes -Sharpe for tangency or variance for GMV.
 *  Returns weights array. */
export function minimizeVariance(mu, covMatrix, { riskFree = 0, targetReturn = null, maxIter = 2000, lr = 0.01, longOnly = true } = {}) {
  const n = mu.length;
  // Initialize equal weights
  let w = Array(n).fill(1 / n);

  for (let iter = 0; iter < maxIter; iter++) {
    // Compute gradient of variance wrt weights: 2 * Σ w
    const grad = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        grad[i] += 2 * covMatrix[i][j] * w[j];
      }
    }

    // If targeting Sharpe, use -Sharpe gradient (approximation)
    const portRet = w.reduce((s, wi, i) => s + wi * mu[i], 0);
    const portVol = Math.sqrt(portfolioVariance(w, covMatrix));
    const sharpe = portVol > 0 ? (portRet - riskFree) / portVol : 0;

    // Gradient step
    w = w.map((wi, i) => wi - lr * grad[i]);

    // Project onto simplex (sum-to-1 + long-only)
    w = projectSimplex(w, longOnly);
  }
  return w;
}

/** Tangency portfolio (maximum Sharpe) via iterative gradient */
export function tangencyPortfolio(mu, covMatrix, riskFree = 0, maxIter = 3000, lr = 0.005) {
  const n = mu.length;
  let w = Array(n).fill(1 / n);

  for (let iter = 0; iter < maxIter; iter++) {
    const portRet = w.reduce((s, wi, i) => s + wi * mu[i], 0);
    const portVar = portfolioVariance(w, covMatrix);
    const portVol = Math.sqrt(portVar);
    if (portVol < 1e-12) break;

    // Gradient of -Sharpe wrt w
    const sigmaW = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) sigmaW[i] += covMatrix[i][j] * w[j];
    }
    const excess = portRet - riskFree;
    const grad = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      grad[i] = -(mu[i] * portVol - excess * sigmaW[i] / portVol) / portVar;
    }
    w = projectSimplex(w.map((wi, i) => wi - lr * grad[i]), true);
  }
  return w;
}

/** Project weights onto simplex (sum to 1, optionally long-only) */
export function projectSimplex(w, longOnly = true) {
  let v = longOnly ? w.map(x => Math.max(x, 0)) : [...w];
  const sum = v.reduce((a, b) => a + b, 0);
  if (sum === 0) return Array(w.length).fill(1 / w.length);
  return v.map(x => x / sum);
}

/** Risk Parity: equal risk contributions */
export function riskParity(covMatrix, maxIter = 500, tol = 1e-6) {
  const n = covMatrix.length;
  let w = Array(n).fill(1 / n);

  for (let iter = 0; iter < maxIter; iter++) {
    const portVol = portfolioVol(w, covMatrix);
    const sigmaW = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) sigmaW[i] += covMatrix[i][j] * w[j];
    }
    // Marginal risk contribution: σ_i = w_i * (Σw)_i / σ_p
    const mrc = sigmaW.map((s, i) => w[i] * s / portVol);
    const targetRC = portVol / n;

    // Update weights toward equal RC
    const newW = w.map((wi, i) => wi * (targetRC / (mrc[i] || 1e-12)));
    const newWNorm = projectSimplex(newW, true);

    const diff = newWNorm.reduce((s, nw, i) => s + Math.abs(nw - w[i]), 0);
    w = newWNorm;
    if (diff < tol) break;
  }
  return w;
}

/** Kelly Criterion: f* = μ / σ² (continuous) or (p*b - q) / b (discrete) */
export function kellyContinuous(mu, sigma) {
  if (sigma === 0) return 0;
  return mu / (sigma ** 2);
}

export function kellyDiscrete(winProb, winMultiple) {
  const loseProb = 1 - winProb;
  return (winProb * winMultiple - loseProb) / winMultiple;
}

/** Naive Black-Litterman: blend market equilibrium with views.
 *  marketReturns: equilibrium implied returns (from market caps)
 *  views: { P: m×n picking matrix, q: m×1 view returns, omega: m×m view uncertainty }
 */
export function blackLitterman(sigma, marketReturns, views, tau = 0.025) {
  const n = marketReturns.length;
  // Compute posterior mean: μ_BL = [(τΣ)^{-1} + P'Ω^{-1}P]^{-1} [(τΣ)^{-1}π + P'Ω^{-1}q]
  // Simplified: blend equilibrium with views using scalars (2-asset approximation)
  // For full matrix inversion, use Pyodide
  if (!views || !views.weights || views.weights.length !== n) return marketReturns;
  const blended = marketReturns.map((pi, i) => {
    const confidence = views.confidence || 0.5;
    return pi * (1 - confidence) + views.weights[i] * confidence;
  });
  return blended;
}

/** Covariance matrix from returns matrix (assets in columns) */
export function sampleCovariance(returnsMatrix) {
  const n = returnsMatrix[0].length;  // assets
  const T = returnsMatrix.length;      // time periods
  const means = Array(n).fill(0).map((_, j) => returnsMatrix.reduce((s, r) => s + r[j], 0) / T);
  const cov = Array.from({ length: n }, () => Array(n).fill(0));
  for (let t = 0; t < T; t++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        cov[i][j] += (returnsMatrix[t][i] - means[i]) * (returnsMatrix[t][j] - means[j]);
      }
    }
  }
  return cov.map(row => row.map(x => x / (T - 1)));
}

/** EWMA covariance matrix */
export function ewmaCovariance(returnsMatrix, lambda = 0.94) {
  const n = returnsMatrix[0].length;
  const T = returnsMatrix.length;
  let cov = sampleCovariance(returnsMatrix.slice(0, 10));
  for (let t = 10; t < T; t++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        cov[i][j] = lambda * cov[i][j] + (1 - lambda) * returnsMatrix[t][i] * returnsMatrix[t][j];
      }
    }
  }
  return cov;
}

/** Efficient frontier points (varying target return) */
export function efficientFrontier(mu, covMatrix, nPoints = 30, riskFree = 0) {
  const minRet = Math.min(...mu);
  const maxRet = Math.max(...mu);
  const points = [];
  for (let i = 0; i <= nPoints; i++) {
    const target = minRet + (maxRet - minRet) * i / nPoints;
    const w = tangencyPortfolio(mu.map(m => m - target + riskFree), covMatrix, riskFree, 1000, 0.01);
    const ret = portfolioReturn(w, mu);
    const vol = portfolioVol(w, covMatrix);
    points.push({ return: ret, volatility: vol, weights: w });
  }
  return points;
}
