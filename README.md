# AI Hedge Fund

A multi-agent stock analysis system that uses **18 rule-based AI agents** to analyze stocks through quantitative strategies modeled after legendary investors. No API keys required — runs entirely on math and market data.

![Python](https://img.shields.io/badge/Python-3.9%2B-blue)
![Flask](https://img.shields.io/badge/Flask-3.0-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## How It Works

The system fetches real-time market data via **yfinance** and passes it through 18 independent agents. Each agent scores the stock from its unique perspective, then a **Risk Manager** assesses overall risk and a **Portfolio Manager** synthesizes everything into a final trade decision.

```
Market Data (yfinance)
       │
       ├──► 12 Investor Agents ──┐
       │                         ├──► Risk Manager ──► Portfolio Manager ──► Trade Decision
       └──► 4 Analyst Agents  ──┘
```

## Agents

### 12 Investor Agents

Each modeled after a famous investor's philosophy:

| Agent | Strategy | Key Metrics |
|-------|----------|-------------|
| **Warren Buffett** | Wide-moat quality compounding | Profit margins, ROE, low debt |
| **Benjamin Graham** | Deep value, margin of safety | P/E < 15, P/B < 1.5, Graham Number |
| **Charlie Munger** | Quality at a fair price | High margins + reasonable P/E |
| **Aswath Damodaran** | DCF-minded valuation | FCF yield, revenue growth, P/E |
| **Michael Burry** | Contrarian deep value | P/B < 1, debt distress, 52-wk lows |
| **Bill Ackman** | Activist, cash flow focus | FCF yield, margin improvement |
| **Cathie Wood** | Disruptive innovation & growth | Revenue growth > 25%, tech sectors |
| **Peter Lynch** | GARP (Growth at Reasonable Price) | PEG ratio, earnings consistency |
| **Philip Fisher** | Long-term growth compounder | Revenue growth, margin expansion |
| **Mohnish Pabrai** | Asymmetric risk/reward bets | Low downside, high FCF, near lows |
| **Rakesh Jhunjhunwala** | Structural growth conviction | Revenue growth, mid-cap, India-style |
| **Stanley Druckenmiller** | Macro & trend following | SMA crossovers, momentum, beta |

### 4 Analyst Agents

| Agent | Focus | Methodology |
|-------|-------|-------------|
| **Valuation Analyst** | Intrinsic value | Graham Number, FCF yield, relative P/E |
| **Sentiment Analyst** | Market mood | RSI extremes, MA positioning, contrarian signals |
| **Fundamentals Analyst** | Financial health | A–F grading on margins, growth, debt, cash flow |
| **Technicals Analyst** | Price action | Golden/death cross, RSI, support/resistance |

### 2 Decision Agents

| Agent | Role |
|-------|------|
| **Risk Manager** | Scores 8 risk factors (volatility, leverage, valuation, etc.) and sets max position size |
| **Portfolio Manager** | Weighs all signals, detects consensus patterns (value trio, growth trio), makes final BUY/SELL/HOLD decision |

## Features

- **Web Dashboard** — Dark-themed professional UI with real-time analysis
- **Multi-Ticker Analysis** — Analyze up to 10 stocks at once with portfolio summary
- **Interactive Charts** — Price history, signal distribution, risk gauge (Chart.js)
- **Agent Signal Cards** — See every agent's vote, confidence level, and reasoning
- **Risk Assessment** — 8-factor risk scoring with position sizing recommendations
- **CLI Mode** — Terminal interface with rich formatted tables
- **No API Keys** — Pure quantitative rules, no LLM calls needed

## Quick Start

### Prerequisites

- Python 3.9+

### Installation

```bash
git clone https://github.com/gaurav46/ai-hedge-fund.git
cd ai-hedge-fund
pip install -r requirements.txt
```

### Run the Web Dashboard

```bash
python app.py
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

Enter a ticker (e.g., `AAPL`) or multiple tickers separated by commas (e.g., `AAPL, MSFT, GOOGL`) and click **Analyze**.

### Run the CLI

```bash
python main.py
```

Follow the prompts to enter a ticker and see the full analysis in your terminal.

## API Endpoints

### `POST /api/analyze`

Analyze a single stock.

```json
{
  "ticker": "AAPL",
  "portfolio_value": 1000000
}
```

### `POST /api/analyze_batch`

Analyze multiple stocks (up to 10).

```json
{
  "tickers": ["AAPL", "MSFT", "GOOGL"],
  "portfolio_value": 1000000
}
```

### Response Structure

```json
{
  "ticker": "AAPL",
  "market_data": { "current_price": 178.5, "pe_ratio": 28.3, "..." : "..." },
  "investor_signals": [
    { "agent_name": "Warren Buffett", "signal": "BUY", "confidence": "HIGH", "reasoning": "..." }
  ],
  "analyst_signals": [ "..." ],
  "risk": { "risk_score": 4, "max_position_size": 0.06, "warnings": [] },
  "decision": { "action": "BUY", "quantity": 336, "conviction": "HIGH", "reasoning": "..." },
  "consensus": { "bullish": 12, "neutral": 4, "bearish": 2, "total": 18 }
}
```

## Project Structure

```
ai_hedge_fund/
├── app.py                  # Flask web server & API endpoints
├── main.py                 # CLI entry point
├── orchestrator.py         # CLI orchestrator (rich tables)
├── models.py               # Data models (Signal, Confidence, MarketData, etc.)
├── config.py               # Configuration
├── agents/
│   ├── base.py             # BaseAgent with scoring utilities
│   ├── investors.py        # 12 investor agent classes
│   ├── analysts.py         # 4 analyst agent classes
│   ├── risk_manager.py     # Risk assessment (8 factors)
│   └── portfolio_manager.py# Final trade decision synthesis
├── data/
│   └── market_data.py      # yfinance data fetching, RSI/SMA computation
├── templates/
│   └── index.html          # Dashboard HTML
├── static/
│   ├── style.css           # Dark theme styles
│   └── app.js              # Frontend logic & Chart.js visualizations
├── requirements.txt
├── Dockerfile
├── Procfile
├── render.yaml
└── gunicorn_config.py
```

## Deployment

### Render (Free Tier)

1. Push to GitHub
2. Go to [dashboard.render.com/new/blueprint](https://dashboard.render.com/new/blueprint)
3. Connect this repo — Render auto-detects `render.yaml`
4. Click **Apply** — deployed!

### Docker

```bash
docker build -t ai-hedge-fund .
docker run -p 10000:10000 ai-hedge-fund
```

## How Scoring Works

Each agent produces a score from **-100 to +100** based on its strategy's criteria:

| Score Range | Signal |
|-------------|--------|
| +60 to +100 | STRONG BUY |
| +20 to +59 | BUY |
| -19 to +19 | HOLD |
| -59 to -20 | SELL |
| -100 to -60 | STRONG SELL |

The Portfolio Manager then:
1. Weighs strong signals at 2x
2. Checks for special consensus patterns (e.g., if Graham + Buffett + Munger all agree)
3. Applies risk overrides (high risk can downgrade decisions)
4. Calculates position size based on conviction and risk score

## Disclaimer

This is an **educational project** for exploring multi-agent systems and quantitative analysis. It is **not financial advice**. The signals produced are based on simplified quantitative rules and should not be used as the sole basis for investment decisions. Always do your own research and consult a qualified financial advisor.

## License

MIT
