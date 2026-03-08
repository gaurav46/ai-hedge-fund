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
