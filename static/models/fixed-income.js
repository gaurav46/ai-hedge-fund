/**
 * Fixed Income & Rates — JavaScript implementations
 */

/** Present Value of cash flows */
export function presentValue(cashFlows, discountRates) {
  return cashFlows.reduce((pv, cf, t) => {
    const r = Array.isArray(discountRates) ? discountRates[t] : discountRates;
    return pv + cf / Math.pow(1 + r, t + 1);
  }, 0);
}

/** Continuous discounting PV */
export function pvContinuous(cashFlows, yields) {
  return cashFlows.reduce((pv, cf, t) => {
    const y = Array.isArray(yields) ? yields[t] : yields;
    return pv + cf * Math.exp(-y * (t + 1));
  }, 0);
}

/** Bond price from coupon rate, face value, yield, maturity */
export function bondPrice(couponRate, faceValue, ytm, nPeriods, periodsPerYear = 2) {
  const coupon = couponRate * faceValue / periodsPerYear;
  const y = ytm / periodsPerYear;
  let price = 0;
  for (let t = 1; t <= nPeriods; t++) {
    price += coupon / Math.pow(1 + y, t);
  }
  price += faceValue / Math.pow(1 + y, nPeriods);
  return price;
}

/** YTM via Newton-Raphson bisection */
export function yieldToMaturity(price, couponRate, faceValue, nPeriods, periodsPerYear = 2, tol = 1e-8) {
  let lo = 0.0001, hi = 2.0;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const midPrice = bondPrice(couponRate, faceValue, mid, nPeriods, periodsPerYear);
    if (Math.abs(midPrice - price) < tol) return mid;
    if (midPrice > price) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Macaulay Duration: weighted average time of cash flows */
export function macaulayDuration(couponRate, faceValue, ytm, nPeriods, periodsPerYear = 2) {
  const coupon = couponRate * faceValue / periodsPerYear;
  const y = ytm / periodsPerYear;
  let weightedSum = 0;
  let price = 0;
  for (let t = 1; t <= nPeriods; t++) {
    const cf = t < nPeriods ? coupon : coupon + faceValue;
    const pv = cf / Math.pow(1 + y, t);
    weightedSum += t * pv;
    price += pv;
  }
  return (weightedSum / price) / periodsPerYear;  // in years
}

/** Modified Duration: D_mac / (1 + y/m) */
export function modifiedDuration(couponRate, faceValue, ytm, nPeriods, periodsPerYear = 2) {
  const macD = macaulayDuration(couponRate, faceValue, ytm, nPeriods, periodsPerYear);
  return macD / (1 + ytm / periodsPerYear);
}

/** Bond price approximation from duration and convexity */
export function bondPriceApproximation(price, modDur, convexity, deltaYield) {
  return price * (-modDur * deltaYield + 0.5 * convexity * deltaYield ** 2);
}

/** Convexity */
export function convexity(couponRate, faceValue, ytm, nPeriods, periodsPerYear = 2) {
  const coupon = couponRate * faceValue / periodsPerYear;
  const y = ytm / periodsPerYear;
  const price = bondPrice(couponRate, faceValue, ytm, nPeriods, periodsPerYear);
  let conv = 0;
  for (let t = 1; t <= nPeriods; t++) {
    const cf = t < nPeriods ? coupon : coupon + faceValue;
    conv += t * (t + 1) * cf / Math.pow(1 + y, t + 2);
  }
  return conv / (price * periodsPerYear ** 2);
}

/** DV01 / PVBP: dollar value of 1 basis point */
export function dv01(price, modDuration) {
  return price * modDuration * 0.0001;
}

/** Forward rate from spot curve: f(t1,t2) */
export function forwardRate(spotT1, t1, spotT2, t2) {
  return (Math.pow(1 + spotT2, t2) / Math.pow(1 + spotT1, t1)) - 1;
}

/** Continuous forward rate */
export function continuousForwardRate(spotT1, t1, spotT2, t2) {
  return (spotT2 * t2 - spotT1 * t1) / (t2 - t1);
}

// ── FX Pricing ─────────────────────────────────────────────────────────────────

/** Covered Interest Parity: F = S * e^{(r_d - r_f) * T} */
export function fxForward(spot, domesticRate, foreignRate, T) {
  return spot * Math.exp((domesticRate - foreignRate) * T);
}

/** FX carry trade return estimate */
export function fxCarryReturn(domesticRate, foreignRate, spotReturn) {
  return (domesticRate - foreignRate) + spotReturn;
}

// ── Futures / Commodities ──────────────────────────────────────────────────────

/** Cost of carry: F = S * e^{(r + u - y) * T} */
export function costOfCarry(spot, riskFree, storageRate, convenienceYield, T) {
  return spot * Math.exp((riskFree + storageRate - convenienceYield) * T);
}

/** Basis: S - F */
export function basis(spot, futures) { return spot - futures; }

/** Roll yield approximation: (F_near - F_far) / F_near */
export function rollYield(frontFutures, backFutures) {
  return (frontFutures - backFutures) / frontFutures;
}

// ── Nelson-Siegel Yield Curve ──────────────────────────────────────────────────

/**
 * Nelson-Siegel parametric yield curve.
 * y(t) = β0 + β1 * (1 - e^{-t/λ})/(t/λ) + β2 * ((1 - e^{-t/λ})/(t/λ) - e^{-t/λ})
 */
export function nelsonSiegel(t, beta0, beta1, beta2, lambda) {
  if (t === 0) return beta0 + beta1;
  const x = t / lambda;
  const factor1 = (1 - Math.exp(-x)) / x;
  const factor2 = factor1 - Math.exp(-x);
  return beta0 + beta1 * factor1 + beta2 * factor2;
}

/** Nelson-Siegel curve for array of maturities */
export function nelsonSiegelCurve(maturities, beta0, beta1, beta2, lambda) {
  return maturities.map(t => nelsonSiegel(t, beta0, beta1, beta2, lambda));
}
