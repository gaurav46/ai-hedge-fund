#!/usr/bin/env python3
"""AI Hedge Fund — Web Dashboard"""

import sys
import os
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, render_template, jsonify, request

from agents.investors import INVESTOR_AGENTS
from agents.analysts import ANALYST_AGENTS
from agents.risk_manager import assess_risk
from agents.portfolio_manager import make_decision
from data.market_data import fetch_market_data
from models import Signal

app = Flask(__name__)
executor = ThreadPoolExecutor()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    ticker = data.get("ticker", "").upper().strip()
    portfolio_value = float(data.get("portfolio_value", 5_000))
    provider = data.get("provider")

    if not ticker:
        return jsonify({"error": "Ticker is required"}), 400

    try:
        result = _analyze_single(ticker, portfolio_value, provider)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Failed to fetch data for {ticker}: {e}"}), 400


def _analyze_single(ticker, portfolio_value, provider=None):
    """Analyze a single ticker. Returns a dict or raises."""
    market_data = fetch_market_data(ticker, provider=provider)

    # Analyze agents in parallel
    investor_futures = [executor.submit(agent.analyze, market_data) for agent in INVESTOR_AGENTS]
    analyst_futures = [executor.submit(agent.analyze, market_data) for agent in ANALYST_AGENTS]

    investor_signals = [f.result() for f in investor_futures]
    analyst_signals = [f.result() for f in analyst_futures]

    all_signals = investor_signals + analyst_signals
    risk = assess_risk(market_data, all_signals)
    trade_decision = make_decision(
        ticker=ticker,
        investor_signals=investor_signals,
        analyst_signals=analyst_signals,
        risk=risk,
        portfolio_value=portfolio_value,
        current_price=market_data.current_price,
    )

    def signal_to_dict(s):
        return {
            "agent_name": s.agent_name,
            "signal": s.signal.value,
            "confidence": s.confidence.value,
            "reasoning": s.reasoning,
        }

    buy_count = sum(1 for s in all_signals if s.signal in (Signal.BUY, Signal.STRONG_BUY))
    sell_count = sum(1 for s in all_signals if s.signal in (Signal.SELL, Signal.STRONG_SELL))
    hold_count = sum(1 for s in all_signals if s.signal == Signal.HOLD)

    return {
        "ticker": ticker,
        "market_data": {
            "current_price": market_data.current_price,
            "market_cap": market_data.market_cap,
            "pe_ratio": market_data.pe_ratio,
            "pb_ratio": market_data.pb_ratio,
            "revenue_growth": market_data.revenue_growth,
            "profit_margin": market_data.profit_margin,
            "debt_to_equity": market_data.debt_to_equity,
            "free_cash_flow": market_data.free_cash_flow,
            "dividend_yield": market_data.dividend_yield,
            "beta": market_data.beta,
            "fifty_two_week_high": market_data.fifty_two_week_high,
            "fifty_two_week_low": market_data.fifty_two_week_low,
            "avg_volume": market_data.avg_volume,
            "sector": market_data.sector,
            "industry": market_data.industry,
            "sma_20": market_data.sma_20,
            "sma_50": market_data.sma_50,
            "sma_200": market_data.sma_200,
            "rsi_14": market_data.rsi_14,
            "price_history_30d": market_data.price_history_30d,
            "summary": market_data.summary[:300] if market_data.summary else "",
            "ohlcv_90d": market_data.ohlcv_90d,
            "volume_history_90d": market_data.volume_history_90d,
            "date_labels_90d": market_data.date_labels_90d,
            "macd_data": market_data.macd_data,
            "bollinger_bands": market_data.bollinger_bands,
            "ema_20": market_data.ema_20,
            "ema_50": market_data.ema_50,
            "adx": market_data.adx,
            "rsi_history": market_data.rsi_history,
            "eps": market_data.eps,
            "forward_pe": market_data.forward_pe,
            "peg_ratio": market_data.peg_ratio,
            "ev_to_ebitda": market_data.ev_to_ebitda,
            "return_on_equity": market_data.return_on_equity,
            "return_on_assets": market_data.return_on_assets,
            "provider": market_data.provider,
        },
        "investor_signals": [signal_to_dict(s) for s in investor_signals],
        "analyst_signals": [signal_to_dict(s) for s in analyst_signals],
        "risk": {
            "risk_score": risk.risk_score,
            "max_position_size": risk.max_position_size,
            "var_95": risk.var_95,
            "warnings": risk.warnings,
        },
        "decision": {
            "action": trade_decision.action,
            "quantity": trade_decision.quantity,
            "conviction": trade_decision.conviction.value,
            "reasoning": trade_decision.reasoning,
            "signals_summary": trade_decision.signals_summary,
        },
        "consensus": {
            "bullish": buy_count,
            "neutral": hold_count,
            "bearish": sell_count,
            "total": len(all_signals),
        },
    }


@app.route("/api/analyze_batch", methods=["POST"])
def analyze_batch():
    data = request.get_json()
    tickers_raw = data.get("tickers", [])
    portfolio_value = float(data.get("portfolio_value", 5_000))
    provider = data.get("provider")

    # Deduplicate and clean
    tickers = list(dict.fromkeys(t.strip().upper() for t in tickers_raw if t.strip()))

    if not tickers:
        return jsonify({"error": "At least one ticker is required"}), 400
    if len(tickers) > 10:
        return jsonify({"error": "Maximum 10 tickers at a time"}), 400

    results = []
    errors = []
    for ticker in tickers:
        try:
            result = _analyze_single(ticker, portfolio_value, provider)
            results.append(result)
        except Exception as e:
            errors.append({"ticker": ticker, "error": str(e)})

    return jsonify({"results": results, "errors": errors})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
