/**
 * Pyodide Web Worker
 * Loads Python WASM (Pyodide), installs quant finance libraries, and
 * handles model computations without blocking the main thread.
 *
 * Installed libraries (awesome-quant):
 *   statsmodels  — ARIMA, VAR, cointegration, OLS, state-space
 *   arch         — GARCH, EGARCH, realized variance
 *   empyrical    — Sharpe, Sortino, max drawdown, Calmar
 *   scipy        — optimization (MVO), statistics (built-in to Pyodide)
 *   numpy        — built-in to Pyodide
 *   pandas       — built-in to Pyodide
 */

importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js');

let pyodide = null;
let isReady = false;
const pendingRequests = new Map();

async function initPyodide() {
  self.postMessage({ type: 'status', status: 'loading', message: 'Loading Python runtime (Pyodide)...' });

  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/',
  });

  self.postMessage({ type: 'status', status: 'installing', message: 'Installing quant libraries...' });

  await pyodide.loadPackage(['micropip', 'numpy', 'scipy', 'pandas']);

  const micropip = pyodide.pyimport('micropip');

  // Install awesome-quant libraries
  const libs = ['statsmodels', 'arch', 'empyrical'];
  for (const lib of libs) {
    try {
      self.postMessage({ type: 'status', status: 'installing', message: `Installing ${lib}...` });
      await micropip.install(lib);
    } catch (e) {
      self.postMessage({ type: 'warning', message: `Could not install ${lib}: ${e.message}` });
    }
  }

  // Preload common imports to reduce latency on first computation
  await pyodide.runPythonAsync(`
import numpy as np
import pandas as pd
from scipy import stats, optimize
import warnings
warnings.filterwarnings('ignore')

try:
    import statsmodels.api as sm
    from statsmodels.tsa.stattools import coint, adfuller
    from statsmodels.tsa.arima.model import ARIMA
    from statsmodels.tsa.vector_ar.var_model import VAR
    _statsmodels_ok = True
except ImportError:
    _statsmodels_ok = False

try:
    from arch import arch_model
    _arch_ok = True
except ImportError:
    _arch_ok = False

try:
    import empyrical
    _empyrical_ok = True
except ImportError:
    _empyrical_ok = False

print("Pyodide ready. statsmodels:", _statsmodels_ok, "arch:", _arch_ok, "empyrical:", _empyrical_ok)
`);

  isReady = true;
  self.postMessage({ type: 'ready', libs: ['numpy', 'scipy', 'pandas', 'statsmodels', 'arch', 'empyrical'] });
}

self.onmessage = async (event) => {
  const { id, type, model_id, params, code } = event.data;

  if (type === 'init') {
    if (!pyodide) await initPyodide();
    return;
  }

  if (!isReady) {
    self.postMessage({ id, type: 'error', error: 'Pyodide not ready. Please wait.' });
    return;
  }

  if (type === 'compute_model') {
    try {
      const result = await computeModel(model_id, params);
      self.postMessage({ id, type: 'result', result });
    } catch (e) {
      self.postMessage({ id, type: 'error', error: e.message });
    }
  }

  if (type === 'run_code') {
    try {
      // Execute arbitrary Python code; capture stdout
      await pyodide.runPythonAsync(`
import sys, io
_stdout_capture = io.StringIO()
sys.stdout = _stdout_capture
`);
      await pyodide.runPythonAsync(code);
      const output = await pyodide.runPythonAsync(`
sys.stdout = sys.__stdout__
_stdout_capture.getvalue()
`);
      self.postMessage({ id, type: 'code_output', output: String(output) });
    } catch (e) {
      self.postMessage({ id, type: 'error', error: e.message });
    }
  }
};

// ── Model Computation Handlers ─────────────────────────────────────────────────

async function computeModel(modelId, params) {
  switch (modelId) {
    case 'garch': return computeGARCH(params);
    case 'arima': return computeARIMA(params);
    case 'engle-granger-coint': return computeCointegration(params);
    case 'kalman-filter': return computeKalman(params);
    case 'mvo': return computeMVO(params);
    case 'pca': return computePCA(params);
    case 'ledoit-wolf': return computeLedoitWolf(params);
    case 'ols': return computeOLS(params);
    case 'var': return computeVAR(params);
    case 'ou-process': return computeOU(params);
    case 'nelson-siegel-fit': return computeNelsonSiegel(params);
    case 'heston': return computeHeston(params);
    default: return { error: `No Pyodide handler for ${modelId}` };
  }
}

async function computeGARCH(params) {
  const returns = Array.isArray(params.returns) ? params.returns : parseCSV(params.returns);
  pyodide.globals.set('returns_data', pyodide.toPy(returns.map(r => r * 100)));  // arch expects % returns
  const result = await pyodide.runPythonAsync(`
from arch import arch_model
import numpy as np

r = np.array(returns_data)
am = arch_model(r, vol='Garch', p=1, q=1, mean='Constant')
res = am.fit(disp='off', show_warning=False)

params = res.params.to_dict()
forecasts = am.fit(disp='off').forecast(horizon=5)
vol_forecast = float(forecasts.variance.values[-1, 0]) ** 0.5 / 100 * np.sqrt(252)

{
  'omega': float(params.get('omega', 0)),
  'alpha': float(params.get('alpha[1]', 0)),
  'beta': float(params.get('beta[1]', 0)),
  'aic': float(res.aic),
  'bic': float(res.bic),
  'persistence': float(params.get('alpha[1]', 0)) + float(params.get('beta[1]', 0)),
  'vol_forecast_annual': vol_forecast,
  'conditional_vol': res.conditional_volatility.tolist(),
}
`);
  return result.toJs({ dict_converter: Object.fromEntries });
}

async function computeARIMA(params) {
  const series = Array.isArray(params.series) ? params.series : parseCSV(params.series);
  pyodide.globals.set('series_data', pyodide.toPy(series));
  pyodide.globals.set('arima_p', params.p || 1);
  pyodide.globals.set('arima_d', params.d || 1);
  pyodide.globals.set('arima_q', params.q || 1);
  const result = await pyodide.runPythonAsync(`
import statsmodels.api as sm
import numpy as np

y = np.array(series_data, dtype=float)
model = sm.tsa.ARIMA(y, order=(arima_p, arima_d, arima_q))
res = model.fit()
forecast = res.forecast(steps=5)

{
  'aic': float(res.aic),
  'bic': float(res.bic),
  'forecast': forecast.tolist(),
  'residuals': res.resid.tolist(),
  'fitted': res.fittedvalues.tolist(),
  'summary': str(res.summary().tables[1]),
}
`);
  return result.toJs({ dict_converter: Object.fromEntries });
}

async function computeCointegration(params) {
  const x = Array.isArray(params.x) ? params.x : parseCSV(params.x);
  const y = Array.isArray(params.y) ? params.y : parseCSV(params.y);
  pyodide.globals.set('coint_x', pyodide.toPy(x));
  pyodide.globals.set('coint_y', pyodide.toPy(y));
  const result = await pyodide.runPythonAsync(`
from statsmodels.tsa.stattools import coint, adfuller
import numpy as np
import statsmodels.api as sm

x = np.array(coint_x, dtype=float)
y = np.array(coint_y, dtype=float)

t_stat, p_value, critical_values = coint(y, x)

# OLS for spread
X = sm.add_constant(x)
beta = sm.OLS(y, X).fit().params[1]
spread = y - beta * x
adf = adfuller(spread)

{
  'coint_t_stat': float(t_stat),
  'coint_p_value': float(p_value),
  'coint_critical_5pct': float(critical_values[1]),
  'cointegrated': bool(p_value < 0.05),
  'hedge_ratio': float(beta),
  'spread': spread.tolist(),
  'spread_adf_pvalue': float(adf[1]),
  'half_life': float(np.log(2) / max(-np.log(sm.OLS(spread[1:], sm.add_constant(spread[:-1])).fit().params[1]), 0.001)),
}
`);
  return result.toJs({ dict_converter: Object.fromEntries });
}

async function computeMVO(params) {
  // Full MVO with scipy.optimize
  pyodide.globals.set('mvo_mu', pyodide.toPy(params.expectedReturns || [0.1, 0.07, 0.12]));
  pyodide.globals.set('mvo_sigma', pyodide.toPy(params.vols || [0.2, 0.15, 0.25]));
  pyodide.globals.set('mvo_corr', pyodide.toPy(params.corrMatrix || [[1, 0.3, 0.2], [0.3, 1, 0.4], [0.2, 0.4, 1]]));
  pyodide.globals.set('mvo_rf', params.riskFree || 0.04);
  const result = await pyodide.runPythonAsync(`
import numpy as np
from scipy.optimize import minimize

mu = np.array(mvo_mu)
sigs = np.array(mvo_sigma)
corr = np.array(mvo_corr)
rf = mvo_rf
n = len(mu)

# Build covariance matrix
cov = np.outer(sigs, sigs) * corr

def portfolio_sharpe(w):
    ret = w @ mu
    vol = np.sqrt(w @ cov @ w)
    return -(ret - rf) / vol if vol > 1e-10 else 0

def portfolio_vol(w):
    return np.sqrt(w @ cov @ w)

# Constraints: sum(w) = 1, w >= 0
constraints = [{'type': 'eq', 'fun': lambda w: np.sum(w) - 1}]
bounds = [(0, 1)] * n
w0 = np.ones(n) / n

# Max Sharpe
res_sharpe = minimize(portfolio_sharpe, w0, bounds=bounds, constraints=constraints)
w_sharpe = res_sharpe.x

# Min Variance
res_gmv = minimize(portfolio_vol, w0, bounds=bounds, constraints=constraints)
w_gmv = res_gmv.x

def port_stats(w):
    ret = float(w @ mu)
    vol = float(np.sqrt(w @ cov @ w))
    sharpe = (ret - rf) / vol if vol > 1e-10 else 0
    return {'return': ret, 'vol': vol, 'sharpe': float(sharpe), 'weights': w.tolist()}

# Efficient frontier
frontier = []
for target in np.linspace(min(mu), max(mu), 30):
    c = [{'type': 'eq', 'fun': lambda w: np.sum(w) - 1},
         {'type': 'eq', 'fun': lambda w, t=target: w @ mu - t}]
    r = minimize(portfolio_vol, w0, bounds=bounds, constraints=c)
    if r.success:
        frontier.append({'return': float(target), 'vol': float(r.fun), 'weights': r.x.tolist()})

{
  'tangency': port_stats(w_sharpe),
  'gmv': port_stats(w_gmv),
  'efficient_frontier': frontier,
}
`);
  return result.toJs({ dict_converter: Object.fromEntries });
}

async function computePCA(params) {
  const returnsMatrix = params.returnsMatrix || [];
  if (!returnsMatrix.length) return { error: 'No returns data' };
  pyodide.globals.set('pca_data', pyodide.toPy(returnsMatrix));
  const result = await pyodide.runPythonAsync(`
import numpy as np

R = np.array(pca_data)
cov = np.cov(R.T)
eigenvalues, eigenvectors = np.linalg.eigh(cov)

# Sort descending
idx = np.argsort(eigenvalues)[::-1]
eigenvalues = eigenvalues[idx]
eigenvectors = eigenvectors[:, idx]

total_var = eigenvalues.sum()
explained = (eigenvalues / total_var).tolist()

{
  'eigenvalues': eigenvalues.tolist(),
  'eigenvectors': eigenvectors.tolist(),
  'explained_variance_ratio': explained,
  'cumulative_explained': np.cumsum(explained).tolist(),
}
`);
  return result.toJs({ dict_converter: Object.fromEntries });
}

async function computeOLS(params) {
  const x = Array.isArray(params.x) ? params.x : parseCSV(params.x);
  const y = Array.isArray(params.y) ? params.y : parseCSV(params.y);
  pyodide.globals.set('ols_x', pyodide.toPy(x));
  pyodide.globals.set('ols_y', pyodide.toPy(y));
  const result = await pyodide.runPythonAsync(`
import statsmodels.api as sm
import numpy as np
X = sm.add_constant(np.array(ols_x, dtype=float))
y = np.array(ols_y, dtype=float)
res = sm.OLS(y, X).fit()
{
  'alpha': float(res.params[0]),
  'beta': float(res.params[1]),
  'r_squared': float(res.rsquared),
  'p_value_beta': float(res.pvalues[1]),
  't_stat': float(res.tvalues[1]),
  'residuals': res.resid.tolist(),
  'fitted': res.fittedvalues.tolist(),
}
`);
  return result.toJs({ dict_converter: Object.fromEntries });
}

async function computeVAR(params) {
  // Series 1 and 2 for bivariate VAR
  const y1 = Array.isArray(params.y1) ? params.y1 : parseCSV(params.y1);
  const y2 = Array.isArray(params.y2) ? params.y2 : parseCSV(params.y2);
  pyodide.globals.set('var_y1', pyodide.toPy(y1));
  pyodide.globals.set('var_y2', pyodide.toPy(y2));
  pyodide.globals.set('var_lags', params.lags || 2);
  const result = await pyodide.runPythonAsync(`
import numpy as np
import pandas as pd
from statsmodels.tsa.vector_ar.var_model import VAR

data = pd.DataFrame({'y1': var_y1, 'y2': var_y2})
model = VAR(data)
res = model.fit(maxlags=var_lags, ic='aic')

forecast = res.forecast(data.values[-res.k_ar:], steps=5)

{
  'aic': float(res.aic),
  'bic': float(res.bic),
  'lag_order': int(res.k_ar),
  'forecast': forecast.tolist(),
  'coef_matrix': res.coefs.tolist(),
}
`);
  return result.toJs({ dict_converter: Object.fromEntries });
}

async function computeOU(params) {
  const spread = Array.isArray(params.spread) ? params.spread : parseCSV(params.spread);
  pyodide.globals.set('ou_spread', pyodide.toPy(spread));
  const result = await pyodide.runPythonAsync(`
import numpy as np
import statsmodels.api as sm

y = np.array(ou_spread)
# AR(1) regression: y_t = a + phi * y_{t-1} + eps
y_lag = y[:-1]
y_curr = y[1:]
X = sm.add_constant(y_lag)
res = sm.OLS(y_curr, X).fit()
phi = float(res.params[1])
mu = float(res.params[0] / (1 - phi))  # theta
sigma_eps = float(np.std(res.resid, ddof=2))

kappa_dt = -np.log(max(phi, 1e-10))
dt = 1/252.0
kappa = kappa_dt / dt

half_life = np.log(2) / max(kappa, 1e-4) * 252

{
  'kappa_annualized': float(kappa),
  'theta_long_run': float(mu),
  'sigma_eps': float(sigma_eps),
  'half_life_days': float(half_life),
  'phi': float(phi),
  'r_squared': float(res.rsquared),
  'mean_reverting': bool(phi < 1),
  'spread': y.tolist(),
}
`);
  return result.toJs({ dict_converter: Object.fromEntries });
}

async function computeLedoitWolf(params) {
  const returnsMatrix = params.returnsMatrix || [];
  if (!returnsMatrix.length) return { error: 'No returns data' };
  pyodide.globals.set('lw_data', pyodide.toPy(returnsMatrix));
  const result = await pyodide.runPythonAsync(`
import numpy as np
from sklearn.covariance import LedoitWolf

R = np.array(lw_data)
lw = LedoitWolf().fit(R)

{
  'shrinkage': float(lw.shrinkage_),
  'covariance': lw.covariance_.tolist(),
  'sample_cov': np.cov(R.T).tolist(),
}
`);
  return result.toJs({ dict_converter: Object.fromEntries });
}

async function computeNelsonSiegel(params) {
  const maturities = params.maturities || [0.25, 0.5, 1, 2, 3, 5, 7, 10, 20, 30];
  const observedYields = params.yields || [];
  pyodide.globals.set('ns_mats', pyodide.toPy(maturities));
  pyodide.globals.set('ns_yields', pyodide.toPy(observedYields));
  const result = await pyodide.runPythonAsync(`
import numpy as np
from scipy.optimize import minimize

mats = np.array(ns_mats)
yields = np.array(ns_yields) if ns_yields else None

def ns_curve(t, b0, b1, b2, lam):
    x = t / lam
    f1 = (1 - np.exp(-x)) / x
    f2 = f1 - np.exp(-x)
    return b0 + b1 * f1 + b2 * f2

if yields is not None and len(yields) == len(mats):
    def obj(params):
        b0, b1, b2, lam = params
        fitted = ns_curve(mats, b0, b1, b2, max(lam, 0.01))
        return np.sum((fitted - yields)**2)
    res = minimize(obj, [0.04, -0.02, 0.01, 1.7], method='Nelder-Mead')
    b0, b1, b2, lam = res.x
else:
    b0, b1, b2, lam = 0.04, -0.02, 0.01, 1.7

fitted_yields = ns_curve(mats, b0, b1, b2, lam).tolist()

{
  'beta0': float(b0),
  'beta1': float(b1),
  'beta2': float(b2),
  'lambda': float(lam),
  'fitted_yields': fitted_yields,
  'maturities': mats.tolist(),
}
`);
  return result.toJs({ dict_converter: Object.fromEntries });
}

async function computeHeston(params) {
  pyodide.globals.set('h_S', params.S || 100);
  pyodide.globals.set('h_K', params.K || 100);
  pyodide.globals.set('h_r', params.r || 0.05);
  pyodide.globals.set('h_T', params.T || 1);
  pyodide.globals.set('h_v0', params.v0 || 0.04);
  pyodide.globals.set('h_kappa', params.kappa || 2.0);
  pyodide.globals.set('h_theta', params.theta || 0.04);
  pyodide.globals.set('h_sigma', params.sigma || 0.3);
  pyodide.globals.set('h_rho', params.rho || -0.7);
  const result = await pyodide.runPythonAsync(`
import numpy as np
from scipy.integrate import quad

def char_fn(phi, S, v0, kappa, theta, sigma, rho, r, T, j):
    i = 1j
    if j == 1:
        u = 0.5; b = kappa - rho * sigma
    else:
        u = -0.5; b = kappa
    a = kappa * theta
    d = np.sqrt((rho * sigma * i * phi - b)**2 - sigma**2 * (2 * u * i * phi - phi**2))
    g = (b - rho * sigma * i * phi + d) / (b - rho * sigma * i * phi - d)
    C = r * i * phi * T + a / sigma**2 * ((b - rho*sigma*i*phi + d)*T - 2*np.log((1 - g*np.exp(d*T))/(1-g)))
    D = (b - rho*sigma*i*phi + d) / sigma**2 * (1 - np.exp(d*T)) / (1 - g*np.exp(d*T))
    return np.exp(C + D * v0 + i * phi * np.log(S))

def heston_call(S, K, r, T, v0, kappa, theta, sigma, rho):
    I1 = lambda phi: np.real(np.exp(-1j*phi*np.log(K)) / (1j*phi) * char_fn(phi, S, v0, kappa, theta, sigma, rho, r, T, 1))
    I2 = lambda phi: np.real(np.exp(-1j*phi*np.log(K)) / (1j*phi) * char_fn(phi, S, v0, kappa, theta, sigma, rho, r, T, 2))
    P1 = 0.5 + 1/np.pi * quad(I1, 1e-9, 200, limit=200)[0]
    P2 = 0.5 + 1/np.pi * quad(I2, 1e-9, 200, limit=200)[0]
    return S * P1 - K * np.exp(-r*T) * P2

call = heston_call(h_S, h_K, h_r, h_T, h_v0, h_kappa, h_theta, h_sigma, h_rho)
put  = call - h_S + h_K * np.exp(-h_r * h_T)

# Implied vol surface for smile
strikes = np.linspace(h_K * 0.7, h_K * 1.3, 15)
smile = []
for k in strikes:
    c = heston_call(h_S, k, h_r, h_T, h_v0, h_kappa, h_theta, h_sigma, h_rho)
    smile.append({'strike': float(k), 'call': float(c)})

{'call': float(call), 'put': float(put), 'smile': smile}
`);
  return result.toJs({ dict_converter: Object.fromEntries });
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function parseCSV(str) {
  if (!str) return [];
  return String(str).split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
}
