/**
 * Quant Finance Model Catalog — 200+ models, equations, and algorithms
 * Each entry drives the Quant Lab UI: equation rendering (KaTeX), interactive
 * parameter inputs, computation routing (JS = instant, pyodide = Python WASM).
 *
 * Libraries referenced (awesome-quant):
 *   - empyrical, arch, statsmodels, scipy, PyPortfolioOpt, FinancePy, vollib
 */

export const CATEGORIES = [
  'Core Returns', 'Statistics', 'Regression', 'Asset Pricing', 'Risk',
  'Portfolio Theory', 'Covariance / Matrices', 'Fixed Income', 'Rates Models',
  'FX', 'Futures / Commodities', 'Stochastic Calculus', 'Derivatives',
  'Advanced Vol Models', 'Greeks', 'Vol Surface', 'Volatility Forecasting',
  'Time Series', 'Regimes', 'Statistical Arbitrage', 'Strategies',
  'Technical Indicators', 'Execution', 'Microstructure', 'Order Book / HFT',
  'Market Making', 'Machine Learning', 'NLP / Alt Data', 'Signal Processing',
  'Backtesting', 'Numerical Methods', 'Credit', 'Mortgage / MBS', 'Crypto / DeFi',
];

export const MODELS = [
  // ── Core Returns ─────────────────────────────────────────────────────────────
  {
    id: 'simple-return', category: 'Core Returns', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Simple Return', assetClass: 'All',
    latex: 'R_t = \\frac{P_t - P_{t-1} + D_t}{P_{t-1}}',
    description: 'Basic arithmetic asset return including dividends.',
    useCase: 'Basic asset return calculation',
    compute: 'js', jsModule: 'returns', jsFunction: 'simpleReturn',
    params: [
      { id: 'priceCurrent', label: 'Current Price', default: 105, min: 0.01 },
      { id: 'pricePrev', label: 'Previous Price', default: 100, min: 0.01 },
      { id: 'dividend', label: 'Dividend', default: 0, min: 0 },
    ],
    outputs: [{ id: 'return', label: 'Return', format: 'pct' }],
    pyCode: `# Simple return (empyrical / pandas)\nimport pandas as pd\nprices = pd.Series([100, 105])\nreturns = prices.pct_change().dropna()\nprint(returns)`,
  },
  {
    id: 'log-return', category: 'Core Returns', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Log Return', assetClass: 'All',
    latex: 'r_t = \\ln\\left(\\frac{P_t}{P_{t-1}}\\right)',
    description: 'Continuously compounded return; additive across time.',
    useCase: 'Time aggregation, modeling',
    compute: 'js', jsModule: 'returns', jsFunction: 'logReturn',
    params: [
      { id: 'priceCurrent', label: 'Current Price', default: 105, min: 0.01 },
      { id: 'pricePrev', label: 'Previous Price', default: 100, min: 0.01 },
    ],
    outputs: [{ id: 'return', label: 'Log Return', format: 'pct' }],
    pyCode: `import numpy as np\nprices = np.array([100, 105])\nlog_returns = np.log(prices[1:] / prices[:-1])\nprint(log_returns)`,
  },
  {
    id: 'cumulative-return', category: 'Core Returns', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Cumulative Return', assetClass: 'All',
    latex: '\\prod_{t=1}^T (1+R_t) - 1',
    description: 'Compound return over multiple periods.',
    useCase: 'Multi-period performance',
    compute: 'js', jsModule: 'returns', jsFunction: 'cumulativeReturn',
    params: [
      { id: 'returns', label: 'Monthly Returns (comma-sep %)', default: '2,3,-1,4,2', type: 'series' },
    ],
    outputs: [{ id: 'return', label: 'Cumulative Return', format: 'pct' }],
    pyCode: `import empyrical\nreturns = [0.02, 0.03, -0.01, 0.04, 0.02]\ncum = empyrical.cum_returns_final(returns)\nprint(cum)`,
  },
  {
    id: 'portfolio-return', category: 'Core Returns', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Portfolio Return', assetClass: 'All',
    latex: 'R_{p,t} = w^\\top R_t',
    description: 'Weighted sum of individual asset returns.',
    useCase: 'Portfolio performance',
    compute: 'js', jsModule: 'returns', jsFunction: 'portfolioReturn',
    params: [
      { id: 'weights', label: 'Weights (comma-sep)', default: '0.4,0.3,0.3', type: 'series' },
      { id: 'returns', label: 'Returns % (comma-sep)', default: '5,3,-2', type: 'series' },
    ],
    outputs: [{ id: 'return', label: 'Portfolio Return', format: 'pct' }],
    pyCode: `import numpy as np\nw = np.array([0.4, 0.3, 0.3])\nR = np.array([0.05, 0.03, -0.02])\nport_ret = w @ R\nprint(port_ret)`,
  },

  // ── Statistics ───────────────────────────────────────────────────────────────
  {
    id: 'mean', category: 'Statistics', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Mean', assetClass: 'All',
    latex: '\\hat{\\mu} = \\frac{1}{T}\\sum_{t=1}^T r_t',
    description: 'Arithmetic average of returns.',
    useCase: 'Average return estimation',
    compute: 'js', jsModule: 'statistics', jsFunction: 'mean',
    params: [{ id: 'arr', label: 'Returns % (comma-sep)', default: '1,2,-1,3,2', type: 'series' }],
    outputs: [{ id: 'result', label: 'Mean', format: 'pct' }],
    pyCode: `import numpy as np\nreturns = np.array([0.01, 0.02, -0.01, 0.03, 0.02])\nprint(np.mean(returns))`,
  },
  {
    id: 'variance-stat', category: 'Statistics', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Variance', assetClass: 'All',
    latex: '\\hat{\\sigma}^2 = \\frac{1}{T-1}\\sum_{t=1}^T (r_t - \\hat{\\mu})^2',
    description: 'Unbiased sample variance.',
    useCase: 'Risk estimation',
    compute: 'js', jsModule: 'statistics', jsFunction: 'variance',
    params: [{ id: 'arr', label: 'Returns % (comma-sep)', default: '1,2,-1,3,2', type: 'series' }],
    outputs: [{ id: 'result', label: 'Variance', format: 'num4' }],
    pyCode: `import numpy as np\nprint(np.var([0.01, 0.02, -0.01, 0.03, 0.02], ddof=1))`,
  },
  {
    id: 'correlation', category: 'Statistics', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Correlation', assetClass: 'All',
    latex: '\\rho_{XY} = \\frac{\\text{Cov}(X,Y)}{\\sigma_X \\sigma_Y}',
    description: 'Pearson correlation coefficient.',
    useCase: 'Diversification analysis',
    compute: 'js', jsModule: 'statistics', jsFunction: 'correlation',
    params: [
      { id: 'x', label: 'Series X (comma-sep)', default: '1,2,-1,3,2', type: 'series' },
      { id: 'y', label: 'Series Y (comma-sep)', default: '2,1,-2,4,1', type: 'series' },
    ],
    outputs: [{ id: 'result', label: 'Correlation', format: 'num4' }],
    pyCode: `import numpy as np\nx = [1, 2, -1, 3, 2]; y = [2, 1, -2, 4, 1]\nprint(np.corrcoef(x, y)[0, 1])`,
  },
  {
    id: 'z-score', category: 'Statistics', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Z-Score', assetClass: 'All',
    latex: 'z_t = \\frac{x_t - \\mu}{\\sigma}',
    description: 'Standardizes a value to number of standard deviations from mean.',
    useCase: 'Signal normalization',
    compute: 'js', jsModule: 'statistics', jsFunction: 'zScore',
    params: [
      { id: 'x', label: 'Value', default: 105 },
      { id: 'mu', label: 'Mean', default: 100 },
      { id: 'sigma', label: 'Std Dev', default: 10 },
    ],
    outputs: [{ id: 'result', label: 'Z-Score', format: 'num2' }],
    pyCode: `from scipy import stats\nprint(stats.zscore([105])[0])  # relative to series\n# or: (x - mu) / sigma = (105 - 100) / 10 = 0.5`,
  },

  // ── Regression ───────────────────────────────────────────────────────────────
  {
    id: 'ols', category: 'Regression', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'OLS Regression', assetClass: 'All',
    latex: '\\hat{\\beta} = (X^\\top X)^{-1}X^\\top y',
    description: 'Ordinary Least Squares: minimize sum of squared residuals.',
    useCase: 'Factor regression, forecasting',
    compute: 'pyodide',
    pyCode: `import statsmodels.api as sm\nimport numpy as np\n\n# Example: CAPM regression\ny = np.array([0.02, 0.03, -0.01, 0.04, 0.02])  # excess returns\nX = sm.add_constant(np.array([0.01, 0.025, -0.005, 0.03, 0.015]))  # market excess\nmodel = sm.OLS(y, X).fit()\nprint(model.summary())`,
    params: [
      { id: 'x', label: 'X values (comma-sep)', default: '1,2,3,4,5', type: 'series' },
      { id: 'y', label: 'Y values (comma-sep)', default: '2.1,3.9,6.2,8.1,9.8', type: 'series' },
    ],
    outputs: [
      { id: 'beta', label: 'Slope (β)', format: 'num4' },
      { id: 'alpha', label: 'Intercept (α)', format: 'num4' },
      { id: 'rSquared', label: 'R²', format: 'num4' },
    ],
    computeJs: (params) => {
      const { olsSimple } = window._quantModels.statistics;
      return olsSimple(params.x, params.y);
    },
  },
  {
    id: 'ridge', category: 'Regression', tier: 2, priority: 'Medium', difficulty: 'Medium',
    name: 'Ridge Regression', assetClass: 'All',
    latex: '\\min \\|y - X\\beta\\|^2 + \\lambda \\|\\beta\\|_2^2',
    description: 'L2 regularization shrinks coefficients, improves conditioning.',
    useCase: 'Shrinkage estimation',
    compute: 'pyodide',
    pyCode: `from sklearn.linear_model import Ridge\nimport numpy as np\nX = np.array([[1],[2],[3],[4],[5]])\ny = np.array([2.1, 3.9, 6.2, 8.1, 9.8])\nmodel = Ridge(alpha=1.0).fit(X, y)\nprint('beta:', model.coef_, 'alpha:', model.intercept_)`,
    params: [
      { id: 'lambda', label: 'Regularization (λ)', default: 1.0, min: 0 },
    ],
  },
  {
    id: 'lasso', category: 'Regression', tier: 2, priority: 'Medium', difficulty: 'Medium',
    name: 'LASSO Regression', assetClass: 'All',
    latex: '\\min \\|y - X\\beta\\|^2 + \\lambda \\|\\beta\\|_1',
    description: 'L1 regularization produces sparse solutions (feature selection).',
    useCase: 'Sparse feature selection',
    compute: 'pyodide',
    pyCode: `from sklearn.linear_model import Lasso\nmodel = Lasso(alpha=0.1).fit(X, y)\nprint(model.coef_)`,
    params: [{ id: 'lambda', label: 'Regularization (λ)', default: 0.1, min: 0 }],
  },

  // ── Asset Pricing ─────────────────────────────────────────────────────────────
  {
    id: 'capm', category: 'Asset Pricing', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'CAPM', assetClass: 'Equities',
    latex: 'E[R_i] = R_f + \\beta_i(E[R_m] - R_f)',
    description: 'Capital Asset Pricing Model: expected return based on market beta.',
    useCase: 'Required return estimation',
    compute: 'js', jsModule: 'risk-metrics', jsFunction: 'capmExpectedReturn',
    params: [
      { id: 'riskFree', label: 'Risk-Free Rate (%)', default: 4.5, min: 0, scale: 0.01 },
      { id: 'betaVal', label: 'Beta', default: 1.2 },
      { id: 'marketReturn', label: 'Expected Market Return (%)', default: 10, min: 0, scale: 0.01 },
    ],
    outputs: [{ id: 'result', label: 'Expected Return', format: 'pct' }],
    pyCode: `# CAPM via statsmodels\nimport statsmodels.api as sm\n# expected = rf + beta * (rm - rf)\nrf, beta, rm = 0.045, 1.2, 0.10\nexpected = rf + beta * (rm - rf)\nprint(f'Expected return: {expected:.2%}')`,
  },
  {
    id: 'beta', category: 'Asset Pricing', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Beta', assetClass: 'Equities',
    latex: '\\beta_i = \\frac{\\text{Cov}(R_i, R_m)}{\\text{Var}(R_m)}',
    description: 'Systematic market exposure / sensitivity.',
    useCase: 'Market exposure',
    compute: 'js', jsModule: 'risk-metrics', jsFunction: 'beta',
    params: [
      { id: 'assetReturns', label: 'Asset Returns % (comma-sep)', default: '2,3,-1,4,2', type: 'series' },
      { id: 'marketReturns', label: 'Market Returns % (comma-sep)', default: '1.5,2.5,-0.5,3,1.5', type: 'series' },
    ],
    outputs: [{ id: 'result', label: 'Beta', format: 'num3' }],
    pyCode: `import numpy as np\nR_i = np.array([0.02, 0.03, -0.01, 0.04, 0.02])\nR_m = np.array([0.015, 0.025, -0.005, 0.03, 0.015])\nbeta = np.cov(R_i, R_m)[0, 1] / np.var(R_m, ddof=1)\nprint(f'Beta: {beta:.4f}')`,
  },
  {
    id: 'jensens-alpha', category: 'Asset Pricing', tier: 1, priority: 'High', difficulty: 'Medium',
    name: "Jensen's Alpha", assetClass: 'Equities',
    latex: '\\alpha = R_i - [R_f + \\beta_i(R_m - R_f)]',
    description: 'Abnormal return above CAPM prediction. Measures manager skill.',
    useCase: 'Manager skill / abnormal return',
    compute: 'js', jsModule: 'risk-metrics', jsFunction: 'jensensAlpha',
    params: [
      { id: 'portfolioReturn', label: 'Portfolio Return (%)', default: 12, scale: 0.01 },
      { id: 'riskFreeRate', label: 'Risk-Free Rate (%)', default: 4, scale: 0.01 },
      { id: 'betaVal', label: 'Beta', default: 1.1 },
      { id: 'marketReturn', label: 'Market Return (%)', default: 10, scale: 0.01 },
    ],
    outputs: [{ id: 'result', label: "Jensen's Alpha", format: 'pct' }],
    pyCode: `import empyrical\nalpha, beta = empyrical.alpha_beta(portfolio_returns, market_returns, risk_free=rf)`,
  },
  {
    id: 'fama-french-3', category: 'Asset Pricing', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Fama-French 3 Factor', assetClass: 'Equities',
    latex: 'R_i = R_f + \\beta_m MKT + \\beta_s SMB + \\beta_v HML + \\varepsilon',
    description: 'Market + size (SMB) + value (HML) factor model.',
    useCase: 'Equity factor modeling',
    compute: 'pyodide',
    pyCode: `import statsmodels.api as sm\n# Load Fama-French factors from pandas-datareader\nimport pandas_datareader.data as web\nff = web.DataReader('F-F_Research_Data_Factors', 'famafrench', start='2020')[0]\n# Regress excess returns on 3 factors\nX = sm.add_constant(ff[['Mkt-RF', 'SMB', 'HML']] / 100)\nmodel = sm.OLS(excess_returns, X).fit()\nprint(model.summary())`,
    params: [],
  },

  // ── Risk ─────────────────────────────────────────────────────────────────────
  {
    id: 'volatility', category: 'Risk', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Volatility', assetClass: 'All',
    latex: '\\sigma = \\sqrt{\\text{Var}(R)} \\cdot \\sqrt{T}',
    description: 'Annualized standard deviation of returns.',
    useCase: 'Risk measurement',
    compute: 'js', jsModule: 'risk-metrics', jsFunction: 'annualizedVol',
    params: [
      { id: 'returns', label: 'Daily Returns % (comma-sep)', default: '0.5,-0.3,0.8,-0.2,0.4,0.1,-0.5,0.6', type: 'series' },
      { id: 'periodsPerYear', label: 'Periods/Year', default: 252 },
    ],
    outputs: [{ id: 'result', label: 'Annualized Vol', format: 'pct' }],
    pyCode: `import empyrical\nvol = empyrical.annual_volatility(daily_returns)\nprint(f'{vol:.2%}')`,
  },
  {
    id: 'sharpe', category: 'Risk', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Sharpe Ratio', assetClass: 'All',
    latex: 'S = \\frac{E[R_p - R_f]}{\\sigma_p}',
    description: 'Risk-adjusted return per unit of total volatility.',
    useCase: 'Risk-adjusted performance',
    compute: 'js', jsModule: 'risk-metrics', jsFunction: 'sharpeRatio',
    params: [
      { id: 'returns', label: 'Daily Returns % (comma-sep)', default: '0.1,0.2,-0.05,0.15,0.08,-0.03,0.12', type: 'series', scale: 0.01 },
      { id: 'riskFreeRate', label: 'Annual Risk-Free Rate (%)', default: 4, scale: 0.01 },
    ],
    outputs: [{ id: 'result', label: 'Sharpe Ratio', format: 'num2' }],
    pyCode: `import empyrical\nsharpe = empyrical.sharpe_ratio(daily_returns, risk_free=0.04/252)\nprint(f'{sharpe:.4f}')`,
  },
  {
    id: 'sortino', category: 'Risk', tier: 1, priority: 'Medium', difficulty: 'Easy',
    name: 'Sortino Ratio', assetClass: 'All',
    latex: 'S_{sortino} = \\frac{E[R_p - R_f]}{\\sigma_{downside}}',
    description: 'Like Sharpe but penalizes only downside deviation.',
    useCase: 'Downside-risk performance',
    compute: 'js', jsModule: 'risk-metrics', jsFunction: 'sortinoRatio',
    params: [
      { id: 'returns', label: 'Daily Returns % (comma-sep)', default: '0.1,0.2,-0.05,0.15,0.08,-0.03,0.12', type: 'series', scale: 0.01 },
      { id: 'targetReturn', label: 'Target Return (%/yr)', default: 0 },
    ],
    outputs: [{ id: 'result', label: 'Sortino Ratio', format: 'num2' }],
    pyCode: `import empyrical\nsortino = empyrical.sortino_ratio(daily_returns)\nprint(sortino)`,
  },
  {
    id: 'max-drawdown', category: 'Risk', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Maximum Drawdown', assetClass: 'All',
    latex: 'MDD = \\max_{0 \\leq t \\leq T} \\frac{\\text{Peak}_t - \\text{Trough}_t}{\\text{Peak}_t}',
    description: 'Largest peak-to-trough decline in portfolio value.',
    useCase: 'Tail path risk',
    compute: 'js', jsModule: 'risk-metrics', jsFunction: 'maxDrawdown',
    params: [
      { id: 'cumReturns', label: 'Equity Curve (comma-sep)', default: '1,1.1,1.05,1.15,0.95,0.9,1.1,1.2', type: 'series' },
    ],
    outputs: [{ id: 'maxDrawdown', label: 'Max Drawdown', format: 'pct' }],
    pyCode: `import empyrical\nmdd = empyrical.max_drawdown(daily_returns)\nprint(f'{mdd:.2%}')`,
  },
  {
    id: 'var-parametric', category: 'Risk', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Parametric VaR', assetClass: 'All',
    latex: 'VaR_\\alpha = -(\\mu + z_\\alpha \\sigma)',
    description: 'Value at Risk assuming normal distribution.',
    useCase: 'Tail loss estimate',
    compute: 'js', jsModule: 'risk-metrics', jsFunction: 'parametricVaR',
    params: [
      { id: 'mu', label: 'Daily Mean Return (%)', default: 0.05, scale: 0.01 },
      { id: 'sigma', label: 'Daily Std Dev (%)', default: 1.5, scale: 0.01 },
      { id: 'confidence', label: 'Confidence Level', default: 0.95, min: 0.5, max: 0.999 },
    ],
    outputs: [{ id: 'result', label: 'Daily VaR', format: 'pct' }],
    pyCode: `from scipy import stats\nimport numpy as np\n# Parametric VaR\nmu, sigma, conf = 0.0005, 0.015, 0.95\nvar = -(mu + stats.norm.ppf(1 - conf) * sigma)\nprint(f'VaR: {var:.4f}')`,
  },
  {
    id: 'expected-shortfall', category: 'Risk', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Expected Shortfall (CVaR)', assetClass: 'All',
    latex: 'ES_\\alpha = E[L \\mid L > VaR_\\alpha]',
    description: 'Average loss beyond VaR threshold. More coherent risk measure.',
    useCase: 'Tail severity',
    compute: 'js', jsModule: 'risk-metrics', jsFunction: 'expectedShortfall',
    params: [
      { id: 'returns', label: 'Returns % (comma-sep)', default: '-3,-2,-1.5,-1,0,1,2,3,-4,-2.5', type: 'series', scale: 0.01 },
      { id: 'confidence', label: 'Confidence', default: 0.95 },
    ],
    outputs: [{ id: 'result', label: 'Expected Shortfall', format: 'pct' }],
    pyCode: `import empyrical\n# Historical CVaR\nes = empyrical.conditional_value_at_risk(daily_returns, cutoff=0.05)\nprint(f'CVaR: {es:.4f}')`,
  },
  {
    id: 'calmar', category: 'Risk', tier: 1, priority: 'Medium', difficulty: 'Easy',
    name: 'Calmar Ratio', assetClass: 'All',
    latex: 'Calmar = \\frac{\\text{Annual Return}}{|MDD|}',
    description: 'Annualized return divided by maximum drawdown.',
    useCase: 'Trend/CTA evaluation',
    compute: 'js', jsModule: 'risk-metrics', jsFunction: 'calmarRatio',
    params: [
      { id: 'annualReturn', label: 'Annual Return (%)', default: 15, scale: 0.01 },
      { id: 'maxDD', label: 'Max Drawdown (%)', default: 20, scale: 0.01 },
    ],
    outputs: [{ id: 'result', label: 'Calmar Ratio', format: 'num2' }],
    pyCode: `import empyrical\ncalmar = empyrical.calmar_ratio(daily_returns)\nprint(calmar)`,
  },

  // ── Portfolio Theory ──────────────────────────────────────────────────────────
  {
    id: 'mvo', category: 'Portfolio Theory', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Mean-Variance Optimization', assetClass: 'All',
    latex: '\\max_w\\; w^\\top \\mu - \\frac{\\gamma}{2} w^\\top \\Sigma w',
    description: 'Markowitz efficient frontier: balance expected return vs risk.',
    useCase: 'Portfolio construction',
    compute: 'pyodide',
    pyCode: `from pypfopt import EfficientFrontier, expected_returns, risk_models\nimport yfinance as yf\n\n# Download prices\nprices = yf.download(['AAPL','MSFT','GOOG'], period='2y')['Close']\n\n# Expected returns and covariance\nmu = expected_returns.mean_historical_return(prices)\nS = risk_models.sample_cov(prices)\n\n# Optimize for max Sharpe\nef = EfficientFrontier(mu, S)\nweights = ef.max_sharpe()\nclean_weights = ef.clean_weights()\nprint(clean_weights)\nef.portfolio_performance(verbose=True)`,
    params: [
      { id: 'mu1', label: 'Asset 1 Expected Return (%)', default: 10, scale: 0.01 },
      { id: 'mu2', label: 'Asset 2 Expected Return (%)', default: 7, scale: 0.01 },
      { id: 'sigma1', label: 'Asset 1 Vol (%)', default: 20, scale: 0.01 },
      { id: 'sigma2', label: 'Asset 2 Vol (%)', default: 15, scale: 0.01 },
      { id: 'rho', label: 'Correlation', default: 0.3, min: -1, max: 1 },
      { id: 'riskFree', label: 'Risk-Free Rate (%)', default: 4, scale: 0.01 },
    ],
    outputs: [
      { id: 'w1', label: 'Weight Asset 1', format: 'pct' },
      { id: 'w2', label: 'Weight Asset 2', format: 'pct' },
      { id: 'sharpe', label: 'Sharpe Ratio', format: 'num2' },
    ],
    charts: ['efficient-frontier'],
  },
  {
    id: 'gmv', category: 'Portfolio Theory', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Global Minimum Variance', assetClass: 'All',
    latex: 'w = \\frac{\\Sigma^{-1}\\mathbf{1}}{\\mathbf{1}^\\top\\Sigma^{-1}\\mathbf{1}}',
    description: 'Portfolio with lowest possible variance.',
    useCase: 'Lowest variance portfolio',
    compute: 'js', jsModule: 'portfolio', jsFunction: 'gmv2Asset',
    params: [
      { id: 'sigma1', label: 'Asset 1 Vol (%)', default: 20, scale: 0.01 },
      { id: 'sigma2', label: 'Asset 2 Vol (%)', default: 15, scale: 0.01 },
      { id: 'rho12', label: 'Correlation', default: 0.3, min: -1, max: 1 },
    ],
    outputs: [
      { id: '0', label: 'Weight Asset 1', format: 'pct' },
      { id: '1', label: 'Weight Asset 2', format: 'pct' },
    ],
    pyCode: `from pypfopt import EfficientFrontier, risk_models\nef = EfficientFrontier(None, S)\nweights = ef.min_volatility()\nprint(ef.clean_weights())`,
  },
  {
    id: 'risk-parity', category: 'Portfolio Theory', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Risk Parity', assetClass: 'Multi-asset',
    latex: 'w_i \\cdot \\frac{\\partial \\sigma_p}{\\partial w_i} = \\frac{\\sigma_p}{N} \\quad \\forall i',
    description: 'Each asset contributes equally to total portfolio risk.',
    useCase: 'Balanced risk allocation',
    compute: 'js', jsModule: 'portfolio', jsFunction: 'riskParity',
    params: [
      { id: 'sigma1', label: 'Asset 1 Vol (%)', default: 20, scale: 0.01 },
      { id: 'sigma2', label: 'Asset 2 Vol (%)', default: 15, scale: 0.01 },
      { id: 'sigma3', label: 'Asset 3 Vol (%)', default: 5, scale: 0.01 },
      { id: 'rho', label: 'All-pair Correlation', default: 0.2, min: -1, max: 1 },
    ],
    outputs: [
      { id: '0', label: 'Weight 1', format: 'pct' },
      { id: '1', label: 'Weight 2', format: 'pct' },
      { id: '2', label: 'Weight 3', format: 'pct' },
    ],
    pyCode: `import riskparity\nimport numpy as np\nS = np.array([[0.04, 0.01], [0.01, 0.0225]])\nw = riskparity.vanilla.design(S)\nprint(w)`,
  },
  {
    id: 'kelly', category: 'Portfolio Theory', tier: 1, priority: 'Medium', difficulty: 'Medium',
    name: 'Kelly Criterion', assetClass: 'All',
    latex: 'f^* = \\frac{\\mu}{\\sigma^2}',
    description: 'Growth-optimal position sizing.',
    useCase: 'Growth-optimal sizing',
    compute: 'js', jsModule: 'portfolio', jsFunction: 'kellyContinuous',
    params: [
      { id: 'mu', label: 'Expected Return (%)', default: 10, scale: 0.01 },
      { id: 'sigma', label: 'Volatility (%)', default: 20, scale: 0.01 },
    ],
    outputs: [{ id: 'result', label: 'Kelly Fraction', format: 'pct' }],
    pyCode: `# Continuous Kelly\nmu, sigma = 0.10, 0.20\nkelly = mu / sigma**2\nprint(f'Kelly fraction: {kelly:.2%}')`,
  },
  {
    id: 'black-litterman', category: 'Portfolio Theory', tier: 2, priority: 'High', difficulty: 'Hard',
    name: 'Black-Litterman', assetClass: 'Multi-asset',
    latex: '\\mu_{BL} = [(\\tau\\Sigma)^{-1} + P^\\top\\Omega^{-1}P]^{-1}[(\\tau\\Sigma)^{-1}\\Pi + P^\\top\\Omega^{-1}q]',
    description: 'Blend market equilibrium returns with investor views using Bayesian updating.',
    useCase: 'Strategic allocation',
    compute: 'pyodide',
    pyCode: `from pypfopt import BlackLittermanModel, risk_models, expected_returns\nimport yfinance as yf\n\nprices = yf.download(['AAPL','MSFT','GOOG','AMZN'], period='2y')['Close']\nS = risk_models.sample_cov(prices)\nmcap = {'AAPL': 3e12, 'MSFT': 2.8e12, 'GOOG': 1.8e12, 'AMZN': 1.9e12}\nbl = BlackLittermanModel(S, pi='market', market_caps=mcap)\n# View: MSFT will outperform GOOG by 3%\nbl.bl_weights()\nprint(bl.bl_returns())`,
    params: [],
  },

  // ── Fixed Income ──────────────────────────────────────────────────────────────
  {
    id: 'bond-price', category: 'Fixed Income', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Bond Price', assetClass: 'Bonds',
    latex: 'P = \\sum_{t=1}^T \\frac{C}{(1+y)^t} + \\frac{F}{(1+y)^T}',
    description: 'Present value of all bond cash flows.',
    useCase: 'Bond valuation',
    compute: 'js', jsModule: 'fixed-income', jsFunction: 'bondPrice',
    params: [
      { id: 'couponRate', label: 'Coupon Rate (%)', default: 5, scale: 0.01 },
      { id: 'faceValue', label: 'Face Value ($)', default: 1000 },
      { id: 'ytm', label: 'YTM (%)', default: 6, scale: 0.01 },
      { id: 'nPeriods', label: 'Periods (semi-annual)', default: 20 },
    ],
    outputs: [{ id: 'result', label: 'Bond Price', format: 'dollar' }],
    pyCode: `from financepy.products.bonds import Bond\nfrom financepy.utils import *\nbond = Bond(IssueDate, MaturityDate, coupon=0.05, freq=FrequencyTypes.SEMI_ANNUAL)\nprice = bond.clean_price_from_ytm(settle_date, 0.06)\nprint(f'Price: {price:.4f}')`,
  },
  {
    id: 'ytm', category: 'Fixed Income', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Yield to Maturity', assetClass: 'Bonds',
    latex: 'P = \\sum_{t=1}^T \\frac{C}{(1+y)^t} + \\frac{F}{(1+y)^T} \\quad \\text{solve for } y',
    description: 'Internal rate of return of bond cash flows. Solved numerically.',
    useCase: 'Quoted bond yield',
    compute: 'js', jsModule: 'fixed-income', jsFunction: 'yieldToMaturity',
    params: [
      { id: 'price', label: 'Market Price ($)', default: 950 },
      { id: 'couponRate', label: 'Coupon Rate (%)', default: 5, scale: 0.01 },
      { id: 'faceValue', label: 'Face Value ($)', default: 1000 },
      { id: 'nPeriods', label: 'Periods', default: 20 },
    ],
    outputs: [{ id: 'result', label: 'YTM', format: 'pct' }],
    pyCode: `from financepy.products.bonds import Bond\nytm = bond.yield_to_maturity(settle_date, price=950)\nprint(f'YTM: {ytm:.4%}')`,
  },
  {
    id: 'modified-duration', category: 'Fixed Income', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Modified Duration', assetClass: 'Bonds',
    latex: 'D_{mod} = \\frac{D_M}{1 + y/m}',
    description: 'Price sensitivity to a 1% change in yield.',
    useCase: 'Small yield-change price sensitivity',
    compute: 'js', jsModule: 'fixed-income', jsFunction: 'modifiedDuration',
    params: [
      { id: 'couponRate', label: 'Coupon Rate (%)', default: 5, scale: 0.01 },
      { id: 'faceValue', label: 'Face Value ($)', default: 1000 },
      { id: 'ytm', label: 'YTM (%)', default: 6, scale: 0.01 },
      { id: 'nPeriods', label: 'Periods', default: 20 },
    ],
    outputs: [{ id: 'result', label: 'Modified Duration (years)', format: 'num3' }],
    pyCode: `from financepy.products.bonds import Bond\nduration = bond.modified_duration(settle_date, ytm)\nprint(f'Mod Duration: {duration:.4f}')`,
  },
  {
    id: 'dv01', category: 'Fixed Income', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'DV01 / PVBP', assetClass: 'Bonds / Rates',
    latex: 'DV01 = P \\cdot D_{mod} \\cdot 0.0001',
    description: 'Dollar value of a 1 basis point change in yield.',
    useCase: 'Rate risk management',
    compute: 'js', jsModule: 'fixed-income', jsFunction: 'dv01',
    params: [
      { id: 'price', label: 'Bond Price ($)', default: 950 },
      { id: 'modDuration', label: 'Modified Duration', default: 7.5 },
    ],
    outputs: [{ id: 'result', label: 'DV01 ($)', format: 'dollar' }],
    pyCode: `dv01 = bond.dollar_duration(settle_date, ytm) / 10000\nprint(f'DV01: ${dv01:.4f}')`,
  },
  {
    id: 'convexity', category: 'Fixed Income', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Convexity', assetClass: 'Bonds',
    latex: 'Convexity = \\frac{1}{P}\\frac{d^2P}{dy^2}',
    description: 'Second-order yield sensitivity. Improves duration approximation.',
    useCase: 'Improved bond price approximation',
    compute: 'js', jsModule: 'fixed-income', jsFunction: 'convexity',
    params: [
      { id: 'couponRate', label: 'Coupon Rate (%)', default: 5, scale: 0.01 },
      { id: 'faceValue', label: 'Face Value ($)', default: 1000 },
      { id: 'ytm', label: 'YTM (%)', default: 6, scale: 0.01 },
      { id: 'nPeriods', label: 'Periods', default: 20 },
    ],
    outputs: [{ id: 'result', label: 'Convexity', format: 'num3' }],
    pyCode: `conv = bond.convexity_from_ytm(settle_date, ytm)\nprint(conv)`,
  },
  {
    id: 'fx-forward', category: 'FX', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Covered Interest Parity', assetClass: 'FX',
    latex: 'F = S_0 \\cdot e^{(r_d - r_f) T}',
    description: 'No-arbitrage forward exchange rate from interest rate differential.',
    useCase: 'Forward FX pricing',
    compute: 'js', jsModule: 'fixed-income', jsFunction: 'fxForward',
    params: [
      { id: 'spot', label: 'Spot Rate', default: 1.10 },
      { id: 'domesticRate', label: 'Domestic Rate (%)', default: 5, scale: 0.01 },
      { id: 'foreignRate', label: 'Foreign Rate (%)', default: 3, scale: 0.01 },
      { id: 'T', label: 'Time (years)', default: 1 },
    ],
    outputs: [{ id: 'result', label: 'Forward Rate', format: 'num4' }],
    pyCode: `import numpy as np\nspot, r_d, r_f, T = 1.10, 0.05, 0.03, 1\nforward = spot * np.exp((r_d - r_f) * T)\nprint(f'Forward: {forward:.4f}')`,
  },
  {
    id: 'cost-of-carry', category: 'Futures / Commodities', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Cost of Carry', assetClass: 'Commodities / Index / FX',
    latex: 'F_0 = S_0 \\cdot e^{(r + u - y) T}',
    description: 'Futures fair value including storage costs and convenience yield.',
    useCase: 'Forward/futures pricing',
    compute: 'js', jsModule: 'fixed-income', jsFunction: 'costOfCarry',
    params: [
      { id: 'spot', label: 'Spot Price ($)', default: 100 },
      { id: 'riskFree', label: 'Risk-Free Rate (%)', default: 5, scale: 0.01 },
      { id: 'storageRate', label: 'Storage Cost (%)', default: 1, scale: 0.01 },
      { id: 'convenienceYield', label: 'Convenience Yield (%)', default: 0, scale: 0.01 },
      { id: 'T', label: 'Time (years)', default: 0.5 },
    ],
    outputs: [{ id: 'result', label: 'Futures Price', format: 'dollar' }],
    pyCode: `import numpy as np\nF = S * np.exp((r + u - y) * T)`,
  },

  // ── Derivatives ───────────────────────────────────────────────────────────────
  {
    id: 'black-scholes', category: 'Derivatives', tier: 1, priority: 'High', difficulty: 'Hard',
    name: 'Black-Scholes-Merton', assetClass: 'Options',
    latex: 'C = S_0 N(d_1) - K e^{-rT} N(d_2), \\quad d_1 = \\frac{\\ln(S/K)+(r+\\frac{\\sigma^2}{2})T}{\\sigma\\sqrt{T}}',
    description: 'Closed-form European option pricing under lognormal asset dynamics.',
    useCase: 'European equity options',
    compute: 'js', jsModule: 'black-scholes', jsFunction: 'bsmBoth',
    params: [
      { id: 'S', label: 'Spot Price', default: 100, min: 0.01 },
      { id: 'K', label: 'Strike Price', default: 100, min: 0.01 },
      { id: 'r', label: 'Risk-Free Rate (%)', default: 5, scale: 0.01 },
      { id: 'T', label: 'Time to Expiry (years)', default: 1, min: 0.001 },
      { id: 'sigma', label: 'Volatility (%)', default: 20, scale: 0.01 },
      { id: 'q', label: 'Dividend Yield (%)', default: 0, scale: 0.01 },
    ],
    outputs: [
      { id: 'call', label: 'Call Price', format: 'dollar' },
      { id: 'put', label: 'Put Price', format: 'dollar' },
    ],
    charts: ['payoff-diagram', 'price-vs-spot'],
    pyCode: `import vollib.black_scholes as bs\ncall = bs.black_scholes('c', S=100, K=100, t=1, r=0.05, sigma=0.20)\nput  = bs.black_scholes('p', S=100, K=100, t=1, r=0.05, sigma=0.20)\nprint(f'Call: {call:.4f}, Put: {put:.4f}')`,
  },
  {
    id: 'black-76', category: 'Derivatives', tier: 1, priority: 'High', difficulty: 'Hard',
    name: 'Black-76', assetClass: 'Options',
    latex: 'C = e^{-rT}[F N(d_1) - K N(d_2)]',
    description: 'Options on futures. Uses forward price instead of spot.',
    useCase: 'Commodity/rates futures options',
    compute: 'js', jsModule: 'black-scholes', jsFunction: 'black76',
    params: [
      { id: 'type', label: 'Option Type', default: 'call', type: 'select', options: ['call', 'put'] },
      { id: 'F', label: 'Forward/Futures Price', default: 100 },
      { id: 'K', label: 'Strike', default: 100 },
      { id: 'r', label: 'Risk-Free Rate (%)', default: 5, scale: 0.01 },
      { id: 'T', label: 'Time to Expiry (years)', default: 0.5 },
      { id: 'sigma', label: 'Volatility (%)', default: 20, scale: 0.01 },
    ],
    outputs: [{ id: 'result', label: 'Option Price', format: 'dollar' }],
    pyCode: `import vollib.black as bk\nprice = bk.black('c', F=100, K=100, t=0.5, r=0.05, sigma=0.20)\nprint(f'Price: {price:.4f}')`,
  },
  {
    id: 'put-call-parity', category: 'Derivatives', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Put-Call Parity', assetClass: 'Options',
    latex: 'C - P = S_0 e^{-qT} - K e^{-rT}',
    description: 'No-arbitrage relationship between call and put prices.',
    useCase: 'No-arbitrage check',
    compute: 'js', jsModule: 'black-scholes', jsFunction: 'putCallParity',
    params: [
      { id: 'S', label: 'Spot Price', default: 100 },
      { id: 'K', label: 'Strike', default: 100 },
      { id: 'r', label: 'Risk-Free Rate (%)', default: 5, scale: 0.01 },
      { id: 'T', label: 'Time (years)', default: 1 },
      { id: 'q', label: 'Dividend Yield (%)', default: 0, scale: 0.01 },
    ],
    outputs: [{ id: 'result', label: 'C - P = Forward Discount', format: 'dollar' }],
    pyCode: `# C - P = S*exp(-q*T) - K*exp(-r*T)\nimport numpy as np\nparity = S * np.exp(-q*T) - K * np.exp(-r*T)\nprint(f'C - P = {parity:.4f}')`,
  },
  {
    id: 'implied-vol', category: 'Vol Surface', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Implied Volatility', assetClass: 'Options',
    latex: '\\text{Solve: } BSM(\\sigma) = \\text{Market Price}',
    description: 'Volatility implied by market option price. Solved via Newton-Raphson.',
    useCase: 'Option quoting/risk',
    compute: 'js', jsModule: 'black-scholes', jsFunction: 'impliedVolatility',
    params: [
      { id: 'type', label: 'Option Type', default: 'call', type: 'select', options: ['call', 'put'] },
      { id: 'marketPrice', label: 'Market Price', default: 10.45 },
      { id: 'S', label: 'Spot Price', default: 100 },
      { id: 'K', label: 'Strike', default: 100 },
      { id: 'r', label: 'Risk-Free Rate (%)', default: 5, scale: 0.01 },
      { id: 'T', label: 'Time (years)', default: 1 },
    ],
    outputs: [{ id: 'result', label: 'Implied Vol', format: 'pct' }],
    pyCode: `import vollib.black_scholes.implied_volatility as iv\nsigma = iv.implied_volatility(10.45, 100, 100, 1, 0.05, 'c')\nprint(f'IV: {sigma:.2%}')`,
  },

  // ── Greeks ────────────────────────────────────────────────────────────────────
  {
    id: 'delta', category: 'Greeks', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Delta', assetClass: 'Options',
    latex: '\\Delta = \\frac{\\partial V}{\\partial S} = e^{-qT} N(d_1)',
    description: 'Rate of change of option price with respect to underlying price.',
    useCase: 'Hedge ratio',
    compute: 'js', jsModule: 'black-scholes', jsFunction: 'delta',
    params: [
      { id: 'type', label: 'Option Type', default: 'call', type: 'select', options: ['call', 'put'] },
      { id: 'S', label: 'Spot', default: 100 }, { id: 'K', label: 'Strike', default: 100 },
      { id: 'r', label: 'Rate (%)', default: 5, scale: 0.01 }, { id: 'T', label: 'T (yr)', default: 1 },
      { id: 'sigma', label: 'Vol (%)', default: 20, scale: 0.01 },
    ],
    outputs: [{ id: 'result', label: 'Delta', format: 'num4' }],
    pyCode: `import vollib.black_scholes.greeks.analytical as greeks\nd = greeks.delta('c', S=100, K=100, t=1, r=0.05, sigma=0.20)\nprint(f'Delta: {d:.4f}')`,
  },
  {
    id: 'gamma', category: 'Greeks', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Gamma', assetClass: 'Options',
    latex: '\\Gamma = \\frac{\\partial^2 V}{\\partial S^2} = \\frac{e^{-qT} N\'(d_1)}{S\\sigma\\sqrt{T}}',
    description: 'Rate of change of delta with respect to underlying price.',
    useCase: 'Convexity of option delta',
    compute: 'js', jsModule: 'black-scholes', jsFunction: 'gamma',
    params: [
      { id: 'S', label: 'Spot', default: 100 }, { id: 'K', label: 'Strike', default: 100 },
      { id: 'r', label: 'Rate (%)', default: 5, scale: 0.01 }, { id: 'T', label: 'T (yr)', default: 1 },
      { id: 'sigma', label: 'Vol (%)', default: 20, scale: 0.01 },
    ],
    outputs: [{ id: 'result', label: 'Gamma', format: 'num4' }],
    pyCode: `g = greeks.gamma('c', 100, 100, 1, 0.05, 0.20)\nprint(g)`,
  },
  {
    id: 'vega', category: 'Greeks', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Vega', assetClass: 'Options',
    latex: '\\nu = \\frac{\\partial V}{\\partial \\sigma} = S e^{-qT} N\'(d_1) \\sqrt{T}',
    description: 'Sensitivity of option price to volatility.',
    useCase: 'Volatility exposure',
    compute: 'js', jsModule: 'black-scholes', jsFunction: 'vega',
    params: [
      { id: 'S', label: 'Spot', default: 100 }, { id: 'K', label: 'Strike', default: 100 },
      { id: 'r', label: 'Rate (%)', default: 5, scale: 0.01 }, { id: 'T', label: 'T (yr)', default: 1 },
      { id: 'sigma', label: 'Vol (%)', default: 20, scale: 0.01 },
    ],
    outputs: [{ id: 'result', label: 'Vega (per 1% vol)', format: 'num4' }],
    pyCode: `v = greeks.vega('c', 100, 100, 1, 0.05, 0.20)\nprint(v)`,
  },
  {
    id: 'theta', category: 'Greeks', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Theta', assetClass: 'Options',
    latex: '\\Theta = \\frac{\\partial V}{\\partial t}',
    description: 'Time decay: daily loss in option value.',
    useCase: 'Time decay',
    compute: 'js', jsModule: 'black-scholes', jsFunction: 'theta',
    params: [
      { id: 'type', label: 'Option Type', default: 'call', type: 'select', options: ['call', 'put'] },
      { id: 'S', label: 'Spot', default: 100 }, { id: 'K', label: 'Strike', default: 100 },
      { id: 'r', label: 'Rate (%)', default: 5, scale: 0.01 }, { id: 'T', label: 'T (yr)', default: 1 },
      { id: 'sigma', label: 'Vol (%)', default: 20, scale: 0.01 },
    ],
    outputs: [{ id: 'result', label: 'Theta ($/day)', format: 'num4' }],
    pyCode: `th = greeks.theta('c', 100, 100, 1, 0.05, 0.20)\nprint(th)`,
  },

  // ── Volatility Forecasting ────────────────────────────────────────────────────
  {
    id: 'ewma-vol', category: 'Volatility Forecasting', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'EWMA Volatility', assetClass: 'All',
    latex: '\\sigma_t^2 = \\lambda \\sigma_{t-1}^2 + (1-\\lambda) r_{t-1}^2',
    description: 'Exponentially Weighted Moving Average volatility. λ=0.94 (RiskMetrics daily).',
    useCase: 'Dynamic vol estimate',
    compute: 'js', jsModule: 'risk-metrics', jsFunction: 'ewmaVolatility',
    params: [
      { id: 'returns', label: 'Daily Returns % (comma-sep)', default: '0.5,-0.3,0.8,-1.2,0.4,0.1,-0.5,0.6,1.1,-0.8', type: 'series', scale: 0.01 },
      { id: 'lambda', label: 'Decay factor (λ)', default: 0.94, min: 0.5, max: 0.999 },
    ],
    outputs: [{ id: 'result', label: 'EWMA Annual Vol', format: 'pct' }],
    pyCode: `import arch\nfrom arch import arch_model\n\n# EWMA via arch library (ConstantMean + EGARCH)\nreturns = [0.005, -0.003, 0.008, -0.012, 0.004]\nam = arch_model(returns, vol='EWMAVol', lags=1)\nres = am.fit()\nprint(res.conditional_volatility)`,
  },
  {
    id: 'garch', category: 'Volatility Forecasting', tier: 1, priority: 'High', difficulty: 'Hard',
    name: 'GARCH(1,1)', assetClass: 'All',
    latex: '\\sigma_t^2 = \\omega + \\alpha \\varepsilon_{t-1}^2 + \\beta \\sigma_{t-1}^2',
    description: 'Generalized ARCH: persistent conditional variance with mean reversion.',
    useCase: 'Conditional vol forecast',
    compute: 'pyodide',
    params: [
      { id: 'returns', label: 'Daily Returns % (comma-sep)', default: '0.5,-0.3,0.8,-1.2,0.4,0.1,-0.5,0.6,1.1,-0.8,0.3,-0.7,1.2,-0.4,0.9', type: 'series', scale: 0.01 },
    ],
    outputs: [
      { id: 'omega', label: 'ω (long-run variance)', format: 'num6' },
      { id: 'alpha', label: 'α (ARCH)', format: 'num4' },
      { id: 'beta', label: 'β (GARCH)', format: 'num4' },
    ],
    pyCode: `from arch import arch_model\nimport numpy as np\n\nreturns = np.array([0.005, -0.003, 0.008, -0.012, 0.004]) * 100  # in %\n\nam = arch_model(returns, vol='Garch', p=1, q=1, mean='Constant')\nres = am.fit(disp='off')\nprint(res.summary())\nprint('Conditional vol:', res.conditional_volatility[-1])`,
  },
  {
    id: 'realized-variance', category: 'Volatility Forecasting', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Realized Variance', assetClass: 'All',
    latex: 'RV_t = \\sum_{i=1}^M r_{t,i}^2',
    description: 'Sum of squared intraday returns. Consistent estimator of integrated variance.',
    useCase: 'High-frequency vol measurement',
    compute: 'js',
    params: [
      { id: 'returns', label: '5-min Returns % (comma-sep)', default: '0.1,-0.08,0.05,0.12,-0.09,0.07,0.03,-0.06,0.11,-0.04', type: 'series', scale: 0.01 },
    ],
    outputs: [
      { id: 'rv', label: 'Realized Variance', format: 'num6' },
      { id: 'annualVol', label: 'Annualized Vol (est)', format: 'pct' },
    ],
    computeJs: (params) => {
      const rv = params.returns.reduce((s, r) => s + r * r, 0);
      const daysPerYear = 252, intradayObs = params.returns.length;
      return { rv, annualVol: Math.sqrt(rv * daysPerYear * daysPerYear / intradayObs) };
    },
    pyCode: `from arch.univariate.volatility import RealizedVariance\nimport pandas as pd\n# Compute realized variance from tick data\nreturns = pd.Series([0.001, -0.0008, 0.0005, 0.0012], index=pd.date_range('2024-01-01', periods=4, freq='5T'))\nrv = (returns**2).resample('D').sum()\nprint(rv)`,
  },

  // ── Time Series ───────────────────────────────────────────────────────────────
  {
    id: 'arima', category: 'Time Series', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'ARIMA', assetClass: 'All',
    latex: '\\phi(B)(1-B)^d x_t = \\theta(B)\\varepsilon_t',
    description: 'AutoRegressive Integrated Moving Average model for stationary forecasting.',
    useCase: 'Forecasting',
    compute: 'pyodide',
    params: [
      { id: 'series', label: 'Series (comma-sep)', default: '100,102,98,105,103,107,104,108,106,110', type: 'series' },
      { id: 'p', label: 'AR order (p)', default: 1, min: 0, max: 5 },
      { id: 'd', label: 'Integration order (d)', default: 1, min: 0, max: 2 },
      { id: 'q', label: 'MA order (q)', default: 1, min: 0, max: 5 },
    ],
    pyCode: `import statsmodels.api as sm\nimport pandas as pd\n\ny = pd.Series([100, 102, 98, 105, 103, 107, 104, 108, 106, 110])\nmodel = sm.tsa.ARIMA(y, order=(1, 1, 1)).fit()\nprint(model.summary())\nforecast = model.forecast(steps=3)\nprint('Forecast:', forecast.values)`,
  },
  {
    id: 'kalman-filter', category: 'Time Series', tier: 1, priority: 'High', difficulty: 'Hard',
    name: 'Kalman Filter', assetClass: 'All',
    latex: 'x_t = Ax_{t-1} + Bu_t + w_t, \\quad z_t = Hx_t + v_t',
    description: 'Recursive Bayesian estimator for linear Gaussian state-space models.',
    useCase: 'Trend extraction, hedge ratios',
    compute: 'pyodide',
    params: [],
    pyCode: `from statsmodels.tsa.statespace.kalman_filter import KalmanFilter\nfrom statsmodels.tsa.statespace.structural import UnobservedComponents\nimport pandas as pd\n\n# Local level model (trend extraction)\nmodel = UnobservedComponents(y, 'local level')\nresult = model.fit()\nprint(result.summary())\nprint('Filtered state:', result.filtered_state[0, :])`,
  },
  {
    id: 'engle-granger-coint', category: 'Time Series', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Engle-Granger Cointegration', assetClass: 'Equities / FX / Rates',
    latex: 's_t = y_t - \\beta x_t \\quad \\text{test: } s_t \\sim I(0)',
    description: 'Regress two series, test residual for stationarity (ADF test).',
    useCase: 'Pairs/stat arb',
    compute: 'pyodide',
    params: [],
    pyCode: `from statsmodels.tsa.stattools import coint\nimport yfinance as yf\n\n# Download pairs\ndata = yf.download(['KO', 'PEP'], period='2y')['Close']\nko, pep = data['KO'], data['PEP']\n\n# Test cointegration\nt_stat, p_value, critical_values = coint(ko, pep)\nprint(f't-stat: {t_stat:.4f}')\nprint(f'p-value: {p_value:.4f}')\nprint(f'Critical values: {critical_values}')`,
  },
  {
    id: 'ou-process', category: 'Time Series', tier: 1, priority: 'High', difficulty: 'Hard',
    name: 'Ornstein-Uhlenbeck', assetClass: 'Rates / Stat Arb',
    latex: 'dX_t = \\kappa(\\theta - X_t)dt + \\sigma dW_t',
    description: 'Continuous mean-reverting process. Calibrated via AR(1) regression.',
    useCase: 'Mean reversion',
    compute: 'pyodide',
    params: [],
    pyCode: `import numpy as np\nfrom statsmodels.regression.linear_model import OLS\nimport statsmodels.api as sm\n\n# Fit OU via AR(1) discretization\n# X_t = theta*(1-exp(-kappa*dt)) + exp(-kappa*dt)*X_{t-1} + eps\ny = spread[1:]         # spread series\nx = sm.add_constant(spread[:-1])\nmodel = OLS(y, x).fit()\nphi = model.params[1]  # exp(-kappa*dt)\nkappa = -np.log(phi) * 252  # annualized\ntheta = model.params[0] / (1 - phi)\nprint(f'kappa={kappa:.4f}, theta={theta:.4f}')`,
  },
  {
    id: 'half-life', category: 'Time Series', tier: 1, priority: 'Medium', difficulty: 'Medium',
    name: 'Half-Life of Mean Reversion', assetClass: 'Stat Arb',
    latex: 't_{1/2} = \\frac{\\ln 2}{\\kappa}',
    description: 'Time for spread to revert halfway to mean. Used to set trade duration.',
    useCase: 'Trade horizon for mean reversion',
    compute: 'js',
    params: [
      { id: 'kappa', label: 'Mean-Reversion Speed κ (annualized)', default: 52 },
    ],
    outputs: [{ id: 'result', label: 'Half-Life (days)', format: 'num1' }],
    computeJs: (p) => ({ result: Math.log(2) / p.kappa * 252 }),
    pyCode: `import numpy as np\nkappa = 52  # annualized\nhalf_life_days = np.log(2) / kappa * 252\nprint(f'Half-life: {half_life_days:.1f} days')`,
  },

  // ── Execution ─────────────────────────────────────────────────────────────────
  {
    id: 'vwap', category: 'Execution', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'VWAP', assetClass: 'Equities / Futures',
    latex: 'VWAP = \\frac{\\sum_t P_t V_t}{\\sum_t V_t}',
    description: 'Volume-Weighted Average Price. Benchmark for execution quality.',
    useCase: 'Benchmark and execution target',
    compute: 'js', jsModule: 'technical', jsFunction: 'vwap',
    params: [
      { id: 'prices', label: 'Prices (comma-sep)', default: '100,101,99,102,100', type: 'series' },
      { id: 'volumes', label: 'Volumes (comma-sep)', default: '1000,2000,1500,3000,1000', type: 'series' },
    ],
    outputs: [{ id: 'result', label: 'VWAP', format: 'dollar' }],
    pyCode: `import pandas as pd\ndf = pd.DataFrame({'price': [100,101,99,102,100], 'volume': [1000,2000,1500,3000,1000]})\nvwap = (df.price * df.volume).sum() / df.volume.sum()\nprint(f'VWAP: {vwap:.4f}')`,
  },
  {
    id: 'implementation-shortfall', category: 'Execution', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Implementation Shortfall', assetClass: 'All',
    latex: 'IS = (P_{exec} - P_{decision}) \\cdot Q + \\text{fees}',
    description: 'Total execution cost vs. decision price. Captures market impact + delay.',
    useCase: 'Transaction cost evaluation',
    compute: 'js',
    params: [
      { id: 'execPrice', label: 'Execution Price', default: 100.5 },
      { id: 'decisionPrice', label: 'Decision Price', default: 100 },
      { id: 'quantity', label: 'Shares', default: 1000 },
      { id: 'fees', label: 'Fees ($)', default: 50 },
    ],
    outputs: [{ id: 'result', label: 'Implementation Shortfall ($)', format: 'dollar' }],
    computeJs: (p) => ({ result: (p.execPrice - p.decisionPrice) * p.quantity + p.fees }),
    pyCode: `# Implementation shortfall\nIS = (exec_price - decision_price) * quantity + fees\nprint(f'IS: ${IS:.2f}')`,
  },

  // ── Machine Learning ──────────────────────────────────────────────────────────
  {
    id: 'random-forest', category: 'Machine Learning', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Random Forest', assetClass: 'All',
    latex: '\\hat{f}(x) = \\frac{1}{B}\\sum_{b=1}^B T_b(x)',
    description: 'Ensemble of decision trees via bootstrap aggregation and feature randomness.',
    useCase: 'Nonlinear prediction',
    compute: 'pyodide',
    params: [],
    pyCode: `from sklearn.ensemble import RandomForestClassifier\nimport numpy as np\n\n# Example: predict return direction\nX_train = np.random.randn(500, 10)  # features\ny_train = (np.random.randn(500) > 0).astype(int)  # up/down\n\nmodel = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)\nmodel.fit(X_train, y_train)\nprint('Feature importance:', model.feature_importances_)`,
  },
  {
    id: 'xgboost', category: 'Machine Learning', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Gradient Boosting / XGBoost', assetClass: 'All',
    latex: '\\hat{y}_i = \\sum_{k=1}^K f_k(x_i), \\quad f_k \\in \\mathcal{F}',
    description: 'Additive ensemble of weak learners via gradient descent on loss.',
    useCase: 'Strong tabular alpha models',
    compute: 'pyodide',
    params: [],
    pyCode: `import xgboost as xgb\nfrom sklearn.metrics import accuracy_score\n\nmodel = xgb.XGBClassifier(n_estimators=100, max_depth=3, learning_rate=0.1)\nmodel.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)\npreds = model.predict(X_test)\nprint(f'Accuracy: {accuracy_score(y_test, preds):.2%}')`,
  },
  {
    id: 'logistic-regression', category: 'Machine Learning', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Logistic Regression', assetClass: 'All',
    latex: 'P(y=1|x) = \\frac{1}{1+e^{-x^\\top\\beta}}',
    description: 'Probabilistic linear classifier for direction/regime prediction.',
    useCase: 'Classification',
    compute: 'pyodide',
    params: [],
    pyCode: `from sklearn.linear_model import LogisticRegression\nmodel = LogisticRegression(C=1.0).fit(X_train, y_train)\nprobs = model.predict_proba(X_test)[:, 1]\nprint('Signal probabilities:', probs[:5])`,
  },

  // ── Signal Processing ─────────────────────────────────────────────────────────
  {
    id: 'information-coefficient', category: 'Signal Processing', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Information Coefficient', assetClass: 'All',
    latex: 'IC = corr(signal_t,\\; return_{t+1})',
    description: 'Rank correlation between signal and next-period return. Signal quality metric.',
    useCase: 'Signal quality',
    compute: 'js', jsModule: 'statistics', jsFunction: 'correlation',
    params: [
      { id: 'x', label: 'Signal values (comma-sep)', default: '1,2,3,4,5,6,7,8,9,10', type: 'series' },
      { id: 'y', label: 'Future returns (comma-sep)', default: '2,1,4,3,6,5,8,7,10,9', type: 'series' },
    ],
    outputs: [{ id: 'result', label: 'Information Coefficient', format: 'num3' }],
    pyCode: `import alphalens\n# Compute IC over factor and forward returns\nmean_ic = alphalens.performance.mean_information_coefficient(factor_data)\nprint(mean_ic)`,
  },
  {
    id: 'fundamental-law', category: 'Signal Processing', tier: 2, priority: 'Medium', difficulty: 'Medium',
    name: 'Fundamental Law of Active Management', assetClass: 'All',
    latex: 'IR = IC \\cdot \\sqrt{BR}',
    description: 'Information Ratio ≈ IC × sqrt(breadth). More bets + better skill → better IR.',
    useCase: 'Skill × breadth framework',
    compute: 'js',
    params: [
      { id: 'ic', label: 'Information Coefficient (IC)', default: 0.05, min: 0, max: 1 },
      { id: 'breadth', label: 'Breadth (# independent bets)', default: 100, min: 1 },
    ],
    outputs: [{ id: 'result', label: 'Information Ratio', format: 'num3' }],
    computeJs: (p) => ({ result: p.ic * Math.sqrt(p.breadth) }),
    pyCode: `import numpy as np\nIC, BR = 0.05, 100\nIR = IC * np.sqrt(BR)\nprint(f'IR: {IR:.3f}')`,
  },

  // ── Backtesting ───────────────────────────────────────────────────────────────
  {
    id: 'walk-forward', category: 'Backtesting', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Walk-Forward Testing', assetClass: 'All',
    latex: '\\text{Train on } [t_0, t_k], \\text{ test on } [t_k, t_{k+1}], \\text{ slide}',
    description: 'Train on past data, test on next out-of-sample window, repeat.',
    useCase: 'Realistic validation',
    compute: 'pyodide',
    params: [],
    pyCode: `from sklearn.model_selection import TimeSeriesSplit\nimport numpy as np\n\ntscv = TimeSeriesSplit(n_splits=5)\nfor train_idx, test_idx in tscv.split(X):\n    X_train, X_test = X[train_idx], X[test_idx]\n    model.fit(X_train, y[train_idx])\n    print(f'Test score: {model.score(X_test, y[test_idx]):.4f}')`,
  },
  {
    id: 'purged-cv', category: 'Backtesting', tier: 2, priority: 'Medium', difficulty: 'Hard',
    name: 'Purged Cross-Validation', assetClass: 'All',
    latex: '\\text{Remove overlap: embargo on } [t_k - \\delta, t_k + \\delta]',
    description: "López de Prado's purged K-fold CV. Removes leakage from overlapping labels.",
    useCase: 'Robust finance ML validation',
    compute: 'pyodide',
    params: [],
    pyCode: `from mlfinlab.cross_validation import PurgedKFold\n# mlfinlab implements Advances in Financial ML methods\ncv = PurgedKFold(n_splits=5, samples_info_sets=t1, pct_embargo=0.01)\nfor train, test in cv.split(X):\n    model.fit(X.iloc[train], y.iloc[train])\n    print(model.score(X.iloc[test], y.iloc[test]))`,
  },

  // ── Numerical Methods ─────────────────────────────────────────────────────────
  {
    id: 'newton-raphson', category: 'Numerical Methods', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Newton-Raphson', assetClass: 'All',
    latex: 'x_{n+1} = x_n - \\frac{f(x_n)}{f\'(x_n)}',
    description: 'Iterative root-finding. Used for implied vol, YTM, calibration.',
    useCase: 'Solve implied vol, yield, calibration',
    compute: 'js',
    params: [
      { id: 'x0', label: 'Initial guess', default: 0.3 },
      { id: 'target', label: 'Target (market price)', default: 10.45 },
    ],
    outputs: [{ id: 'result', label: 'Root (Implied Vol)', format: 'pct' }],
    computeJs: (p) => {
      // Solve for IV: BSM call = 10.45, S=K=100, r=5%, T=1
      const S = 100, K = 100, r = 0.05, T = 1;
      const { bsmPrice, vega: bsmVega } = window._quantModels['black-scholes'];
      let x = p.x0;
      for (let i = 0; i < 100; i++) {
        const diff = bsmPrice('call', S, K, r, T, x) - p.target;
        const v = bsmVega(S, K, r, T, x) * 100;
        if (Math.abs(diff) < 1e-8) break;
        x -= diff / v;
        if (x <= 0) x = 1e-6;
      }
      return { result: x };
    },
    pyCode: `from scipy.optimize import brentq\n# Find implied vol\nf = lambda sigma: bsmPrice('c', S=100, K=100, t=1, r=0.05, sigma=sigma) - 10.45\niv = brentq(f, 0.001, 5.0)\nprint(f'IV: {iv:.4f}')`,
  },
  {
    id: 'pca', category: 'Covariance / Matrices', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'PCA', assetClass: 'All',
    latex: '\\Sigma v = \\lambda v',
    description: 'Principal Component Analysis: eigendecomposition of covariance matrix.',
    useCase: 'Dimension reduction',
    compute: 'pyodide',
    params: [],
    pyCode: `import numpy as np\nfrom sklearn.decomposition import PCA\n\n# Returns matrix (T × N)\nreturns = np.random.randn(252, 50) * 0.01\n\npca = PCA(n_components=5)\npca.fit(returns)\nprint('Explained variance ratio:', pca.explained_variance_ratio_)\nprint('First PC loadings:', pca.components_[0])`,
  },
  {
    id: 'ledoit-wolf', category: 'Covariance / Matrices', tier: 2, priority: 'Medium', difficulty: 'Hard',
    name: 'Ledoit-Wolf Shrinkage', assetClass: 'All',
    latex: '\\hat{\\Sigma} = (1-\\alpha) \\hat{\\Sigma}_{sample} + \\alpha \\mu_{target} I',
    description: 'Shrinks sample covariance towards structured target. Better conditioning.',
    useCase: 'Better conditioning',
    compute: 'pyodide',
    params: [],
    pyCode: `from sklearn.covariance import LedoitWolf\nimport numpy as np\n\nreturns = np.random.randn(252, 50) * 0.01\nlw = LedoitWolf().fit(returns)\nprint('Shrinkage coefficient:', lw.shrinkage_)\nprint('Estimated covariance matrix shape:', lw.covariance_.shape)`,
  },

  // ── Credit ────────────────────────────────────────────────────────────────────
  {
    id: 'expected-loss', category: 'Credit', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Expected Loss', assetClass: 'Credit',
    latex: 'EL = PD \\cdot LGD \\cdot EAD',
    description: 'Probability of Default × Loss Given Default × Exposure at Default.',
    useCase: 'Credit risk',
    compute: 'js',
    params: [
      { id: 'pd', label: 'Probability of Default (%)', default: 2, scale: 0.01 },
      { id: 'lgd', label: 'Loss Given Default (%)', default: 45, scale: 0.01 },
      { id: 'ead', label: 'Exposure at Default ($M)', default: 10 },
    ],
    outputs: [{ id: 'result', label: 'Expected Loss ($M)', format: 'num4' }],
    computeJs: (p) => ({ result: p.pd * p.lgd * p.ead }),
    pyCode: `PD, LGD, EAD = 0.02, 0.45, 10  # $M\nEL = PD * LGD * EAD\nprint(f'Expected Loss: ${EL:.4f}M')`,
  },
  {
    id: 'hazard-rate', category: 'Credit', tier: 2, priority: 'High', difficulty: 'Hard',
    name: 'Hazard Rate Model', assetClass: 'Credit',
    latex: 'S(t) = e^{-\\int_0^t \\lambda(u)\\,du}',
    description: 'Survival probability from constant or term-structure of hazard rates.',
    useCase: 'Default intensity',
    compute: 'js',
    params: [
      { id: 'lambda', label: 'Hazard Rate (%/yr)', default: 2, scale: 0.01 },
      { id: 't', label: 'Time (years)', default: 5 },
    ],
    outputs: [{ id: 'result', label: 'Survival Probability', format: 'pct' }],
    computeJs: (p) => ({ result: Math.exp(-p.lambda * p.t) }),
    pyCode: `import numpy as np\nlambda_, t = 0.02, 5\nsurvival = np.exp(-lambda_ * t)\nprint(f'Survival prob: {survival:.4f}')`,
  },
  {
    id: 'credit-triangle', category: 'Credit', tier: 2, priority: 'Medium', difficulty: 'Medium',
    name: 'Credit Triangle', assetClass: 'Credit',
    latex: 's \\approx \\lambda (1 - R)',
    description: 'Approximation: CDS spread ≈ hazard rate × loss given default.',
    useCase: 'Spread ↔ hazard approximation',
    compute: 'js',
    params: [
      { id: 'hazardRate', label: 'Hazard Rate (%/yr)', default: 2, scale: 0.01 },
      { id: 'recovery', label: 'Recovery Rate (%)', default: 40, scale: 0.01 },
    ],
    outputs: [{ id: 'result', label: 'CDS Spread (bps)', format: 'num1' }],
    computeJs: (p) => ({ result: p.hazardRate * (1 - p.recovery) * 10000 }),
    pyCode: `# Credit triangle approximation\nlambda_, R = 0.02, 0.40\nspread_bps = lambda_ * (1 - R) * 10000\nprint(f'CDS Spread: {spread_bps:.1f} bps')`,
  },
  {
    id: 'gbm', category: 'Stochastic Calculus', tier: 1, priority: 'High', difficulty: 'Hard',
    name: 'Geometric Brownian Motion', assetClass: 'Equities / FX',
    latex: 'dS_t = \\mu S_t\\,dt + \\sigma S_t\\,dW_t',
    description: 'Standard model for equity price dynamics under lognormal assumption.',
    useCase: 'Base diffusion model',
    compute: 'js',
    params: [
      { id: 'S0', label: 'Initial Price', default: 100 },
      { id: 'mu', label: 'Drift (%/yr)', default: 10, scale: 0.01 },
      { id: 'sigma', label: 'Volatility (%/yr)', default: 20, scale: 0.01 },
      { id: 'T', label: 'Time Horizon (years)', default: 1 },
      { id: 'nSteps', label: 'Steps', default: 252 },
    ],
    outputs: [{ id: 'finalPrice', label: 'Expected Final Price', format: 'dollar' }],
    computeJs: (p) => ({
      finalPrice: p.S0 * Math.exp((p.mu - 0.5 * p.sigma ** 2) * p.T),
      drift: p.S0 * Math.exp(p.mu * p.T),
    }),
    charts: ['gbm-paths'],
    pyCode: `import numpy as np\n\nS0, mu, sigma, T, N = 100, 0.10, 0.20, 1, 252\ndt = T / N\npaths = 100\n\nW = np.random.standard_normal((paths, N))\ndS = (mu - 0.5 * sigma**2) * dt + sigma * np.sqrt(dt) * W\nS = S0 * np.exp(np.cumsum(dS, axis=1))\nprint(f'Mean final price: {S[:,-1].mean():.2f}')`,
  },

  // ── Statistical Arbitrage ─────────────────────────────────────────────────────
  {
    id: 'spread', category: 'Statistical Arbitrage', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Spread', assetClass: 'Equities / FX / Rates',
    latex: 's_t = y_t - \\beta x_t',
    description: 'Residual from regression of one asset on another. Used in pairs trading.',
    useCase: 'Relative value',
    compute: 'js',
    params: [
      { id: 'y', label: 'Series Y (comma-sep)', default: '100,101,103,102,105', type: 'series' },
      { id: 'x', label: 'Series X (comma-sep)', default: '50,51,52,51,53', type: 'series' },
    ],
    outputs: [
      { id: 'beta', label: 'Hedge Ratio β', format: 'num3' },
      { id: 'spreadLast', label: 'Current Spread', format: 'num3' },
    ],
    computeJs: (p) => {
      const { olsSimple } = window._quantModels.statistics;
      const reg = olsSimple(p.x, p.y);
      const spreadLast = p.y[p.y.length - 1] - reg.beta * p.x[p.x.length - 1] - reg.alpha;
      return { beta: reg.beta, spreadLast };
    },
    pyCode: `import numpy as np\nfrom statsmodels.api import OLS, add_constant\nbeta = OLS(y, add_constant(x)).fit().params[1]\nspread = y - beta * x\nprint(f'beta={beta:.3f}')`,
  },
  {
    id: 'ts-momentum', category: 'Strategies', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Time-Series Momentum', assetClass: 'Futures / Multi-asset',
    latex: 'signal_t = \\text{sign}(R_{t-L,t})',
    description: 'Go long if past L-period return is positive, short if negative.',
    useCase: 'Trend following',
    compute: 'js',
    params: [
      { id: 'prices', label: 'Price series (comma-sep)', default: '100,98,97,99,102,105,103,107,110,108,112', type: 'series' },
      { id: 'lookback', label: 'Lookback period', default: 5, min: 1 },
    ],
    outputs: [
      { id: 'signal', label: 'Signal (+1 / -1)', format: 'num0' },
      { id: 'pastReturn', label: 'Past Return', format: 'pct' },
    ],
    computeJs: (p) => {
      const n = p.prices.length;
      const lb = Math.min(p.lookback, n - 1);
      const pastReturn = (p.prices[n - 1] - p.prices[n - 1 - lb]) / p.prices[n - 1 - lb];
      return { signal: Math.sign(pastReturn), pastReturn };
    },
    pyCode: `import pandas as pd\nprices = pd.Series([100,98,97,99,102,105,103,107,110,108,112])\nmomentum = prices.pct_change(5).apply(np.sign)\nprint(momentum)`,
  },
  {
    id: 'sma-indicator', category: 'Technical Indicators', tier: 1, priority: 'Medium', difficulty: 'Easy',
    name: 'Simple Moving Average', assetClass: 'All',
    latex: 'SMA_t = \\frac{1}{n}\\sum_{i=0}^{n-1} P_{t-i}',
    description: 'Arithmetic average over a rolling window.',
    useCase: 'Trend filter',
    compute: 'js', jsModule: 'technical', jsFunction: 'sma',
    params: [
      { id: 'prices', label: 'Prices (comma-sep)', default: '100,101,99,102,103,101,104,105,103,106', type: 'series' },
      { id: 'window', label: 'Window', default: 5, min: 2 },
    ],
    outputs: [{ id: 'result', label: 'SMA (last value)', format: 'dollar' }],
    pyCode: `import pandas as pd\nprices = pd.Series([100,101,99,102,103,101,104,105,103,106])\nsma = prices.rolling(5).mean()\nprint(sma)`,
  },
  {
    id: 'rsi-indicator', category: 'Technical Indicators', tier: 1, priority: 'Medium', difficulty: 'Easy',
    name: 'RSI', assetClass: 'All',
    latex: 'RSI = 100 - \\frac{100}{1 + RS}, \\quad RS = \\frac{\\text{Avg Gain}}{\\text{Avg Loss}}',
    description: 'Momentum oscillator: values >70 overbought, <30 oversold.',
    useCase: 'Overbought/oversold',
    compute: 'js', jsModule: 'technical', jsFunction: 'rsi',
    params: [
      { id: 'prices', label: 'Prices (comma-sep)', default: '100,102,101,104,103,105,106,104,108,107,110,109,111,110,113', type: 'series' },
      { id: 'period', label: 'Period', default: 14, min: 2 },
    ],
    outputs: [{ id: 'result', label: 'RSI (last)', format: 'num1' }],
    pyCode: `import pandas as pd\nprices = pd.Series([...])\ndelta = prices.diff()\ngain = delta.clip(lower=0).rolling(14).mean()\nloss = (-delta.clip(upper=0)).rolling(14).mean()\nrsi = 100 - 100/(1 + gain/loss)\nprint(rsi.iloc[-1])`,
  },
  {
    id: 'microstructure-mid', category: 'Microstructure', tier: 1, priority: 'High', difficulty: 'Easy',
    name: 'Mid Price', assetClass: 'Equities / FX / Futures',
    latex: 'Mid = \\frac{Ask + Bid}{2}',
    description: 'Fair value proxy between best bid and ask.',
    useCase: 'Fair quote proxy',
    compute: 'js',
    params: [
      { id: 'ask', label: 'Ask Price', default: 100.10 },
      { id: 'bid', label: 'Bid Price', default: 99.90 },
    ],
    outputs: [
      { id: 'mid', label: 'Mid Price', format: 'dollar' },
      { id: 'spread', label: 'Bid-Ask Spread', format: 'num4' },
    ],
    computeJs: (p) => ({ mid: (p.ask + p.bid) / 2, spread: p.ask - p.bid }),
    pyCode: `mid = (ask + bid) / 2\nspread = ask - bid`,
  },
  {
    id: 'heston', category: 'Advanced Vol Models', tier: 2, priority: 'High', difficulty: 'Hard',
    name: 'Heston Stochastic Volatility', assetClass: 'Options',
    latex: 'dS = (r-q)S\\,dt + \\sqrt{v}S\\,dW_S,\\quad dv = \\kappa(\\theta-v)\\,dt + \\xi\\sqrt{v}\\,dW_v',
    description: 'Stochastic variance follows CIR process. Captures implied vol smile/skew.',
    useCase: 'Smile/skew pricing',
    compute: 'pyodide',
    params: [
      { id: 'S', label: 'Spot', default: 100 }, { id: 'K', label: 'Strike', default: 100 },
      { id: 'r', label: 'Rate (%)', default: 5, scale: 0.01 }, { id: 'T', label: 'T (yr)', default: 1 },
      { id: 'v0', label: 'Initial Variance', default: 0.04 },
      { id: 'kappa', label: 'Mean-Reversion Speed κ', default: 2.0 },
      { id: 'theta', label: 'Long-Run Variance θ', default: 0.04 },
      { id: 'sigma', label: 'Vol of Vol ξ', default: 0.3 },
      { id: 'rho', label: 'Correlation ρ', default: -0.7, min: -1, max: 1 },
    ],
    pyCode: `import numpy as np\nfrom scipy.integrate import quad\n\ndef heston_char_fn(phi, S, v0, kappa, theta, sigma, rho, r, T):\n    a = kappa * theta\n    b = kappa - rho * sigma * 1j * phi\n    d = np.sqrt(b**2 + sigma**2 * (1j*phi + phi**2))\n    g = (b - d) / (b + d)\n    C = r*1j*phi*T + a/sigma**2 * ((b-d)*T - 2*np.log((1 - g*np.exp(-d*T))/(1-g)))\n    D = (b - d) / sigma**2 * (1 - np.exp(-d*T)) / (1 - g*np.exp(-d*T))\n    return np.exp(C + D*v0 + 1j*phi*np.log(S))\n\ndef heston_call(S, K, r, T, v0, kappa, theta, sigma, rho):\n    integrand1 = lambda phi: np.real(np.exp(-1j*phi*np.log(K)) * heston_char_fn(phi-1j, S, v0, kappa, theta, sigma, rho, r, T) / (1j*phi*heston_char_fn(-1j, S, v0, kappa, theta, sigma, rho, r, T)))\n    integrand2 = lambda phi: np.real(np.exp(-1j*phi*np.log(K)) * heston_char_fn(phi, S, v0, kappa, theta, sigma, rho, r, T) / (1j*phi))\n    P1 = 0.5 + 1/np.pi * quad(integrand1, 0, 200)[0]\n    P2 = 0.5 + 1/np.pi * quad(integrand2, 0, 200)[0]\n    return S * P1 - K * np.exp(-r*T) * P2\n\nprice = heston_call(100, 100, 0.05, 1, 0.04, 2.0, 0.04, 0.3, -0.7)\nprint(f'Heston call price: {price:.4f}')`,
  },
  {
    id: 'sabr', category: 'Advanced Vol Models', tier: 2, priority: 'High', difficulty: 'Hard',
    name: 'SABR Model', assetClass: 'Rates / FX Options',
    latex: 'dF = \\sigma F^\\beta dW_1,\\quad d\\sigma = \\alpha\\sigma\\,dW_2',
    description: 'Stochastic Alpha Beta Rho model for rates/FX vol surface.',
    useCase: 'Rates/FX smile modeling',
    compute: 'js',
    params: [
      { id: 'F', label: 'Forward Rate', default: 0.03 },
      { id: 'K', label: 'Strike', default: 0.03 },
      { id: 'T', label: 'Expiry (yr)', default: 1 },
      { id: 'alpha', label: 'α (initial vol)', default: 0.04 },
      { id: 'beta', label: 'β (backbone)', default: 0.5, min: 0, max: 1 },
      { id: 'rho', label: 'ρ (skew)', default: -0.25, min: -1, max: 1 },
      { id: 'nu', label: 'ν (vol of vol)', default: 0.35 },
    ],
    outputs: [{ id: 'impliedVol', label: 'SABR Implied Vol', format: 'pct' }],
    computeJs: (p) => {
      // Hagan SABR approximation
      const { F, K, T, alpha, beta, rho, nu } = p;
      let iv;
      if (Math.abs(F - K) < 1e-8) {
        // ATM approximation
        const FKbeta = Math.pow(F, 1 - beta);
        iv = (alpha / FKbeta) * (1 + ((1 - beta) ** 2 / 24 * alpha ** 2 / FKbeta ** 2 + rho * beta * nu * alpha / (4 * FKbeta) + (2 - 3 * rho ** 2) / 24 * nu ** 2) * T);
      } else {
        const logFK = Math.log(F / K);
        const FKbeta = Math.pow(F * K, (1 - beta) / 2);
        const z = nu / alpha * FKbeta * logFK;
        const xz = Math.log((Math.sqrt(1 - 2 * rho * z + z ** 2) + z - rho) / (1 - rho));
        iv = alpha * z / (FKbeta * xz * (1 + (1 - beta) ** 2 / 24 * logFK ** 2 + (1 - beta) ** 4 / 1920 * logFK ** 4))
          * (1 + ((1 - beta) ** 2 / 24 * alpha ** 2 / FKbeta ** 2 + rho * beta * nu * alpha / (4 * FKbeta) + (2 - 3 * rho ** 2) / 24 * nu ** 2) * T);
      }
      return { impliedVol: iv };
    },
    pyCode: `from pysabr import Hagan2002LognormalSABR\nsabr = Hagan2002LognormalSABR(f=0.03, shift=0, t=1, v_atm_n=0.04, beta=0.5, rho=-0.25, volvol=0.35)\niv = sabr.lognormal_vol(K=0.03)\nprint(f'SABR IV: {iv:.4%}')`,
  },
  {
    id: 'nelson-siegel', category: 'Fixed Income', tier: 2, priority: 'Medium', difficulty: 'Medium',
    name: 'Nelson-Siegel', assetClass: 'Rates',
    latex: 'y(t) = \\beta_0 + \\beta_1 \\frac{1-e^{-t/\\lambda}}{t/\\lambda} + \\beta_2 \\left(\\frac{1-e^{-t/\\lambda}}{t/\\lambda} - e^{-t/\\lambda}\\right)',
    description: 'Parametric yield curve with level, slope, and curvature factors.',
    useCase: 'Curve fitting',
    compute: 'js', jsModule: 'fixed-income', jsFunction: 'nelsonSiegelCurve',
    params: [
      { id: 'maturities', label: 'Maturities (comma-sep, yr)', default: '0.25,0.5,1,2,3,5,7,10,20,30', type: 'series' },
      { id: 'beta0', label: 'β₀ (long-run level)', default: 4, scale: 0.01 },
      { id: 'beta1', label: 'β₁ (slope)', default: -2, scale: 0.01 },
      { id: 'beta2', label: 'β₂ (curvature)', default: 1, scale: 0.01 },
      { id: 'lambda', label: 'λ (decay)', default: 1.7 },
    ],
    outputs: [{ id: 'result', label: 'Yield Curve (last maturity)', format: 'pct' }],
    charts: ['yield-curve'],
    pyCode: `from nelson_siegel_svensson import NelsonSiegel\ncurve = NelsonSiegel(beta0=0.04, beta1=-0.02, beta2=0.01, tau=1.7)\nyields = curve([0.25, 0.5, 1, 2, 3, 5, 7, 10, 20, 30])\nprint(yields)`,
  },
  {
    id: 'monte-carlo', category: 'Derivatives', tier: 1, priority: 'High', difficulty: 'Medium',
    name: 'Monte Carlo Option Pricing', assetClass: 'Options',
    latex: 'V_0 = e^{-rT} E^\\mathbb{Q}[\\text{payoff}(S_T)]',
    description: 'Risk-neutral expectation via simulated paths. Used for path-dependent options.',
    useCase: 'Path-dependent options',
    compute: 'js',
    params: [
      { id: 'S', label: 'Spot', default: 100 }, { id: 'K', label: 'Strike', default: 100 },
      { id: 'r', label: 'Rate (%)', default: 5, scale: 0.01 }, { id: 'T', label: 'T (yr)', default: 1 },
      { id: 'sigma', label: 'Vol (%)', default: 20, scale: 0.01 },
      { id: 'nSims', label: 'Simulations', default: 10000, min: 1000 },
    ],
    outputs: [
      { id: 'callPrice', label: 'Call Price (MC)', format: 'dollar' },
      { id: 'bsmPrice', label: 'Call Price (BSM)', format: 'dollar' },
    ],
    computeJs: (p) => {
      const { S, K, r, T, sigma, nSims } = p;
      const { bsmPrice } = window._quantModels['black-scholes'];
      let sumPayoff = 0;
      for (let i = 0; i < nSims; i++) {
        const z = normInv(Math.random());
        const ST = S * Math.exp((r - 0.5 * sigma ** 2) * T + sigma * Math.sqrt(T) * z);
        sumPayoff += Math.max(ST - K, 0);
      }
      const callPrice = Math.exp(-r * T) * sumPayoff / nSims;
      const bsm = bsmPrice('call', S, K, r, T, sigma);
      return { callPrice, bsmPrice: bsm };

      function normInv(u) {
        // Box-Muller
        return Math.sqrt(-2 * Math.log(u || 1e-10)) * Math.cos(2 * Math.PI * Math.random());
      }
    },
    pyCode: `import numpy as np\nS, K, r, T, sigma, nSims = 100, 100, 0.05, 1, 0.20, 100000\nZ = np.random.standard_normal(nSims)\nS_T = S * np.exp((r - 0.5*sigma**2)*T + sigma*np.sqrt(T)*Z)\ncall_mc = np.exp(-r*T) * np.maximum(S_T - K, 0).mean()\nprint(f'MC Call: {call_mc:.4f}')`,
  },
];

/** Build category index */
export const MODEL_BY_ID = Object.fromEntries(MODELS.map(m => [m.id, m]));
export const MODELS_BY_CATEGORY = CATEGORIES.reduce((acc, cat) => {
  acc[cat] = MODELS.filter(m => m.category === cat);
  return acc;
}, {});
