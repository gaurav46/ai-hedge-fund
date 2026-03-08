/**
 * Black-Scholes-Merton + Black-76 + Bachelier + Greeks
 * Pure JavaScript, instant execution.
 */
import { normCDF, normPDF, normInvCDF } from './statistics.js';

// ── Black-Scholes-Merton ────────────────────────────────────────────────────────

export function bsmD1(S, K, r, T, sigma, q = 0) {
  return (Math.log(S / K) + (r - q + 0.5 * sigma ** 2) * T) / (sigma * Math.sqrt(T));
}

export function bsmD2(S, K, r, T, sigma, q = 0) {
  return bsmD1(S, K, r, T, sigma, q) - sigma * Math.sqrt(T);
}

/**
 * BSM option price.
 * @param {string} type - 'call' or 'put'
 * @param {number} S - spot price
 * @param {number} K - strike price
 * @param {number} r - risk-free rate (annual, continuous)
 * @param {number} T - time to expiry (years)
 * @param {number} sigma - volatility (annual)
 * @param {number} q - continuous dividend yield (default 0)
 */
export function bsmPrice(type, S, K, r, T, sigma, q = 0) {
  if (T <= 0) {
    const intrinsic = type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0);
    return intrinsic;
  }
  const d1 = bsmD1(S, K, r, T, sigma, q);
  const d2 = d1 - sigma * Math.sqrt(T);
  const disc = Math.exp(-r * T);
  const discQ = Math.exp(-q * T);
  if (type === 'call') {
    return S * discQ * normCDF(d1) - K * disc * normCDF(d2);
  }
  return K * disc * normCDF(-d2) - S * discQ * normCDF(-d1);
}

/** BSM prices for both call and put */
export function bsmBoth(S, K, r, T, sigma, q = 0) {
  return {
    call: bsmPrice('call', S, K, r, T, sigma, q),
    put: bsmPrice('put', S, K, r, T, sigma, q),
  };
}

// ── Greeks ─────────────────────────────────────────────────────────────────────

export function delta(type, S, K, r, T, sigma, q = 0) {
  const d1 = bsmD1(S, K, r, T, sigma, q);
  if (type === 'call') return Math.exp(-q * T) * normCDF(d1);
  return Math.exp(-q * T) * (normCDF(d1) - 1);
}

export function gamma(S, K, r, T, sigma, q = 0) {
  const d1 = bsmD1(S, K, r, T, sigma, q);
  return Math.exp(-q * T) * normPDF(d1) / (S * sigma * Math.sqrt(T));
}

export function vega(S, K, r, T, sigma, q = 0) {
  const d1 = bsmD1(S, K, r, T, sigma, q);
  return S * Math.exp(-q * T) * normPDF(d1) * Math.sqrt(T) / 100; // per 1% vol
}

export function theta(type, S, K, r, T, sigma, q = 0) {
  const d1 = bsmD1(S, K, r, T, sigma, q);
  const d2 = d1 - sigma * Math.sqrt(T);
  const term1 = -Math.exp(-q * T) * S * normPDF(d1) * sigma / (2 * Math.sqrt(T));
  if (type === 'call') {
    return (term1 - r * K * Math.exp(-r * T) * normCDF(d2)
      + q * S * Math.exp(-q * T) * normCDF(d1)) / 365;
  }
  return (term1 + r * K * Math.exp(-r * T) * normCDF(-d2)
    - q * S * Math.exp(-q * T) * normCDF(-d1)) / 365;
}

export function rho(type, S, K, r, T, sigma, q = 0) {
  const d2 = bsmD2(S, K, r, T, sigma, q);
  if (type === 'call') return K * T * Math.exp(-r * T) * normCDF(d2) / 100;
  return -K * T * Math.exp(-r * T) * normCDF(-d2) / 100;
}

export function vanna(S, K, r, T, sigma, q = 0) {
  const d1 = bsmD1(S, K, r, T, sigma, q);
  const d2 = d1 - sigma * Math.sqrt(T);
  return -Math.exp(-q * T) * normPDF(d1) * d2 / sigma;
}

export function volga(S, K, r, T, sigma, q = 0) {
  const d1 = bsmD1(S, K, r, T, sigma, q);
  const d2 = d1 - sigma * Math.sqrt(T);
  return S * Math.exp(-q * T) * normPDF(d1) * Math.sqrt(T) * d1 * d2 / sigma;
}

/** All Greeks in one call */
export function allGreeks(type, S, K, r, T, sigma, q = 0) {
  return {
    delta: delta(type, S, K, r, T, sigma, q),
    gamma: gamma(S, K, r, T, sigma, q),
    vega: vega(S, K, r, T, sigma, q),
    theta: theta(type, S, K, r, T, sigma, q),
    rho: rho(type, S, K, r, T, sigma, q),
    vanna: vanna(S, K, r, T, sigma, q),
    volga: volga(S, K, r, T, sigma, q),
  };
}

// ── Implied Volatility (Newton-Raphson) ─────────────────────────────────────────

/**
 * Solve implied volatility from market price using Newton-Raphson.
 * @returns {number|null} implied vol or null if not converged
 */
export function impliedVolatility(type, marketPrice, S, K, r, T, q = 0, tol = 1e-6, maxIter = 100) {
  let sigma = 0.3; // initial guess
  for (let i = 0; i < maxIter; i++) {
    const price = bsmPrice(type, S, K, r, T, sigma, q);
    const diff = price - marketPrice;
    if (Math.abs(diff) < tol) return sigma;
    const v = vega(S, K, r, T, sigma, q) * 100; // unscale
    if (Math.abs(v) < 1e-12) break;
    sigma -= diff / v;
    if (sigma <= 0) sigma = 1e-6;
  }
  return null;
}

// ── Put-Call Parity ─────────────────────────────────────────────────────────────

/** No-arbitrage check: C - P = S*e^{-qT} - K*e^{-rT} */
export function putCallParity(S, K, r, T, q = 0) {
  return S * Math.exp(-q * T) - K * Math.exp(-r * T);
}

// ── Black-76 (Futures options) ──────────────────────────────────────────────────

export function black76(type, F, K, r, T, sigma) {
  const d1 = (Math.log(F / K) + 0.5 * sigma ** 2 * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const disc = Math.exp(-r * T);
  if (type === 'call') return disc * (F * normCDF(d1) - K * normCDF(d2));
  return disc * (K * normCDF(-d2) - F * normCDF(-d1));
}

// ── Bachelier (Normal) model ───────────────────────────────────────────────────

export function bachelierPrice(type, F, K, sigma, T) {
  const h = (F - K) / (sigma * Math.sqrt(T));
  if (type === 'call') {
    return (F - K) * normCDF(h) + sigma * Math.sqrt(T) * normPDF(h);
  }
  return (K - F) * normCDF(-h) + sigma * Math.sqrt(T) * normPDF(h);
}

// ── European Binomial Tree ─────────────────────────────────────────────────────

/**
 * European/American option via CRR binomial tree.
 * @param {boolean} american - true for American option
 */
export function binomialTree(type, S, K, r, T, sigma, N = 100, q = 0, american = false) {
  const dt = T / N;
  const u = Math.exp(sigma * Math.sqrt(dt));
  const d = 1 / u;
  const p = (Math.exp((r - q) * dt) - d) / (u - d);
  const disc = Math.exp(-r * dt);

  // Terminal stock prices
  const S_T = Array.from({ length: N + 1 }, (_, j) => S * Math.pow(u, N - j) * Math.pow(d, j));

  // Terminal option values
  let V = S_T.map(s => type === 'call' ? Math.max(s - K, 0) : Math.max(K - s, 0));

  // Backward induction
  for (let i = N - 1; i >= 0; i--) {
    for (let j = 0; j <= i; j++) {
      V[j] = disc * (p * V[j] + (1 - p) * V[j + 1]);
      if (american) {
        const s = S * Math.pow(u, i - j) * Math.pow(d, j);
        const intrinsic = type === 'call' ? Math.max(s - K, 0) : Math.max(K - s, 0);
        V[j] = Math.max(V[j], intrinsic);
      }
    }
  }
  return V[0];
}

// ── Vol Surface helpers ─────────────────────────────────────────────────────────

/** Log-moneyness k = ln(K/F) */
export function logMoneyness(K, F) { return Math.log(K / F); }

/** Vol surface payoff diagram data */
export function payoffDiagram(type, K, premium, nPoints = 50, range = 0.5) {
  const spots = [];
  const payoffs = [];
  const pnls = [];
  const sMin = K * (1 - range), sMax = K * (1 + range);
  const step = (sMax - sMin) / nPoints;
  for (let i = 0; i <= nPoints; i++) {
    const s = sMin + i * step;
    spots.push(s);
    const intrinsic = type === 'call' ? Math.max(s - K, 0) : Math.max(K - s, 0);
    payoffs.push(intrinsic);
    pnls.push(intrinsic - premium);
  }
  return { spots, payoffs, pnls };
}
