# AI Hedge Fund + Quant Lab

A multi-agent stock analysis system combined with a **200+ model quantitative finance encyclopedia**, hosted on **Cloudflare Pages** (free tier).

![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-orange)
![Python](https://img.shields.io/badge/Pyodide-Python%20WASM-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## What's Inside

### Analysis Tab — 18 AI Agents
Fetches real-time market data and runs 18 rule-based agents modeled after legendary investors. No API keys required for Yahoo Finance.

```
Market Data (Yahoo Finance / Alpha Vantage)
       │
       ├──► 12 Investor Agents ──┐
       │                         ├──► Risk Manager ──► Portfolio Manager ──► Trade Decision
       └──► 4 Analyst Agents  ──┘
```

### Quant Lab — 200+ Financial Models
An interactive encyclopedia covering:
- Black-Scholes, Greeks, Implied Volatility
- Portfolio Optimization (MVO, GMV, Risk Parity, Kelly)
- Fixed Income (Bond pricing, Duration, Convexity, YTM)
- Risk Metrics (Sharpe, Sortino, VaR, ES, Max Drawdown)
- Technical Indicators (RSI, MACD, Bollinger, ATR)
- GARCH, ARIMA, Cointegration, PCA (via Python/Pyodide)
- Factor Models, Market Microstructure, Execution Algorithms

Each model includes a **KaTeX-rendered equation**, **interactive calculator**, **Plotly chart**, and **Python code snippet**.

---

## Deploy to Cloudflare Pages (Free Tier)

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (for Wrangler CLI)
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
- Git

### Step 1 — Clone and install

```bash
git clone https://github.com/your-username/ai-hedge-fund.git
cd ai-hedge-fund
npm install
```

### Step 2 — Login to Cloudflare

```bash
npx wrangler login
```

This opens a browser window. Authorize Wrangler with your Cloudflare account.

### Step 3 — Preview locally

```bash
npm run dev
```

Opens a local preview at **http://localhost:8788** with full Cloudflare Pages Functions support (API proxying, etc.).

### Step 4 — Deploy

```bash
npm run deploy
```

Output will include your live URL, e.g.:
```
✨ Deployment complete!
🌐 https://ai-hedge-fund.pages.dev
```

### Step 5 — Set environment variables (optional — Alpha Vantage only)

The default data provider is **Yahoo Finance** (no key needed). To enable Alpha Vantage:

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages** → your project
2. **Settings** → **Environment Variables** → **Production**
3. Add: `ALPHA_VANTAGE_API_KEY` = your key from [alphavantage.co](https://www.alphavantage.co/support/#api-key)

---

## Local Python Development (Flask)

The original Flask app still works locally for development.

```bash
pip install -r requirements.txt
python app.py
```

Open [http://localhost:5000](http://localhost:5000).

> **Note:** The Flask app and Cloudflare deployment are independent. Flask runs Python agents server-side; Cloudflare runs them in JavaScript (Pages Functions) or in the browser via Pyodide.

---

## Project Structure

```
ai_hedge_fund/
├── wrangler.toml               # Cloudflare Pages config
├── package.json                # npm run dev / deploy
│
├── functions/                  # Cloudflare Pages Functions (JavaScript)
│   └── api/
│       ├── market-data.js      # Yahoo Finance + Alpha Vantage proxy + all 18 agents
│       ├── analyze.js          # /api/analyze → market-data (backward compat)
│       └── analyze_batch.js    # /api/analyze_batch → multi-ticker
│
├── static/                     # Served as-is by Cloudflare Pages
│   ├── index.html              # Single-page app (Analysis + Quant Lab tabs)
│   ├── app.js                  # Dashboard logic, charts, agent rendering
│   ├── style.css               # Dark/light/system theme styles
│   ├── quant-lab.js            # Quant Lab UI controller (ES module)
│   ├── pyodide-worker.js       # Web Worker: Python WASM (GARCH, ARIMA, MVO, etc.)
│   │
│   ├── models/                 # JavaScript model implementations (instant)
│   │   ├── black-scholes.js    # BSM, all Greeks, implied vol, binomial tree
│   │   ├── risk-metrics.js     # Sharpe, Sortino, VaR, ES, max drawdown
│   │   ├── portfolio.js        # MVO, GMV, tangency, risk parity, Kelly
│   │   ├── fixed-income.js     # Bond price, YTM, duration, convexity, DV01
│   │   ├── technical.js        # SMA, EMA, MACD, RSI, Bollinger, ATR
│   │   ├── returns.js          # Simple/log/cumulative/portfolio returns
│   │   └── statistics.js       # Mean, variance, OLS, normCDF, z-score
│   │
│   └── catalog/
│       └── models.js           # 200+ model definitions (metadata + params)
│
├── agents/                     # Python agents (Flask / CLI only)
│   ├── investors.py            # 12 investor agents
│   ├── analysts.py             # 4 analyst agents
│   ├── risk_manager.py
│   └── portfolio_manager.py
│
├── app.py                      # Flask web server (local dev)
├── main.py                     # CLI entry point
└── requirements.txt            # Python dependencies
```

---

## How the Cloudflare Architecture Works

```
Browser
  │
  ├── Static files ──────────────────► Cloudflare Pages CDN
  │   (HTML, CSS, JS, models/)         (free, global, instant)
  │
  ├── /api/analyze POST ─────────────► Pages Function (JS, Edge)
  │                                     └── Fetches Yahoo Finance / Alpha Vantage
  │                                     └── Runs all 18 agents in JavaScript
  │                                     └── Returns same JSON as Flask app
  │
  └── Quant Lab heavy models ────────► Pyodide Web Worker (Python in Browser)
      (GARCH, ARIMA, MVO, PCA, etc.)   └── statsmodels, arch, scipy (via micropip)
                                        └── Runs entirely client-side, no server cost
```

**Cloudflare free tier limits used:**

| Product | Free Limit | Usage |
|---------|-----------|-------|
| Pages | Unlimited bandwidth, 500 deploys/month | Static hosting |
| Pages Functions | 100,000 req/day, 10ms CPU | API proxy only |

All computation (Pyodide) runs in the user's browser — no Cloudflare CPU limits apply.

---

## Agents

### 12 Investor Agents

| Agent | Strategy |
|-------|----------|
| Warren Buffett | Wide-moat quality compounding |
| Benjamin Graham | Deep value, margin of safety |
| Charlie Munger | Quality at a fair price |
| Aswath Damodaran | DCF-minded valuation |
| Michael Burry | Contrarian deep value |
| Bill Ackman | Activist, cash flow focus |
| Cathie Wood | Disruptive innovation & growth |
| Peter Lynch | GARP (Growth at Reasonable Price) |
| Philip Fisher | Long-term growth compounder |
| Mohnish Pabrai | Asymmetric risk/reward |
| Rakesh Jhunjhunwala | Structural growth conviction |
| Stanley Druckenmiller | Macro & trend following |

### 4 Analyst Agents

| Agent | Focus |
|-------|-------|
| Valuation Analyst | Graham Number, FCF yield, relative P/E |
| Sentiment Analyst | RSI extremes, MA positioning |
| Fundamentals Analyst | A–F grading on margins, growth, debt |
| Technicals Analyst | Golden/death cross, RSI, support/resistance |

### Scoring

| Score | Signal |
|-------|--------|
| +60 to +100 | STRONG BUY |
| +20 to +59 | BUY |
| -19 to +19 | HOLD |
| -59 to -20 | SELL |
| -100 to -60 | STRONG SELL |

---

## Quant Lab — Model Tiers

**Tier 1 — Must Know**
Black-Scholes, CAPM, Sharpe Ratio, VaR, Duration, RSI, MACD, Bollinger Bands, Kelly Criterion, Efficient Frontier, Maximum Drawdown, Beta, VWAP

**Tier 2 — Very Important**
GARCH, Implied Volatility Surface, Risk Parity, Black-Litterman, Nelson-Siegel, OLS Regression, Cointegration, Kalman Filter, Information Ratio, CVaR

**Tier 3 — Advanced**
Heston Model, SABR, Hull-White, Ornstein-Uhlenbeck, Ledoit-Wolf, HAR-RV, Kyle Lambda, Almgren-Chriss, DCC-GARCH, Variance Gamma

---

## Scripts Reference

```bash
npm run dev      # Local preview (http://localhost:8788) with Pages Functions
npm run deploy   # Deploy to Cloudflare Pages

python app.py    # Flask local server (http://localhost:5000)
python main.py   # CLI analysis
```

---

## Disclaimer

This is an **educational project** for exploring multi-agent systems and quantitative finance. It is **not financial advice**. Always do your own research and consult a qualified financial advisor.

## License

MIT
