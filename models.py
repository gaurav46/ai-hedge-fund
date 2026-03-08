"""Data models for the AI Hedge Fund."""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum


class Signal(Enum):
    STRONG_BUY = "strong_buy"
    BUY = "buy"
    HOLD = "hold"
    SELL = "sell"
    STRONG_SELL = "strong_sell"


class Confidence(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


@dataclass
class AgentSignal:
    agent_name: str
    signal: Signal
    confidence: Confidence
    reasoning: str
    target_price: float | None = None
    stop_loss: float | None = None


@dataclass
class RiskAssessment:
    max_position_size: float  # as fraction of portfolio
    risk_score: float  # 0-10
    var_95: float  # value at risk
    warnings: list[str] = field(default_factory=list)


@dataclass
class TradeDecision:
    ticker: str
    action: str  # BUY, SELL, HOLD
    quantity: int
    conviction: Confidence
    reasoning: str
    signals_summary: dict[str, str] = field(default_factory=dict)


@dataclass
class MarketData:
    ticker: str
    current_price: float
    market_cap: float | None
    pe_ratio: float | None
    pb_ratio: float | None
    revenue_growth: float | None
    profit_margin: float | None
    debt_to_equity: float | None
    free_cash_flow: float | None
    dividend_yield: float | None
    beta: float | None
    fifty_two_week_high: float | None
    fifty_two_week_low: float | None
    avg_volume: float | None
    sector: str | None
    industry: str | None
    price_history_30d: list[float] = field(default_factory=list)
    price_history_90d: list[float] = field(default_factory=list)
    sma_20: float | None = None
    sma_50: float | None = None
    sma_200: float | None = None
    rsi_14: float | None = None
    summary: str = ""

    # --- Rich chart data (populated by Alpha Vantage) ---
    # OHLCV daily data: [{date, open, high, low, close, volume}, ...]
    ohlcv_90d: list[dict] = field(default_factory=list)
    volume_history_90d: list[float] = field(default_factory=list)
    date_labels_90d: list[str] = field(default_factory=list)
    # MACD: {macd: [], signal: [], histogram: [], dates: []}
    macd_data: dict | None = None
    # Bollinger: {upper: [], middle: [], lower: [], dates: []}
    bollinger_bands: dict | None = None
    ema_20: float | None = None
    ema_50: float | None = None
    adx: float | None = None
    atr: float | None = None
    rsi_history: list = field(default_factory=list)
    # Extra fundamentals from Alpha Vantage OVERVIEW
    eps: float | None = None
    forward_pe: float | None = None
    peg_ratio: float | None = None
    book_value: float | None = None
    ev_to_ebitda: float | None = None
    return_on_equity: float | None = None
    return_on_assets: float | None = None
    quarterly_revenue_growth_yoy: float | None = None
    quarterly_earnings_growth_yoy: float | None = None
    provider: str = "yfinance"
