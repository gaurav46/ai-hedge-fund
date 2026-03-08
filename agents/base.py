"""Base agent class for all hedge fund agents — pure quantitative, no API needed."""

from __future__ import annotations
from models import AgentSignal, Signal, Confidence, MarketData


class BaseAgent:
    """Base class for all hedge fund agents. Subclasses implement analyze()."""

    name: str = "Base Agent"

    def analyze(self, data: MarketData) -> AgentSignal:
        """Analyze market data and return a signal. Override in subclasses."""
        return AgentSignal(
            agent_name=self.name,
            signal=Signal.HOLD,
            confidence=Confidence.LOW,
            reasoning="No analysis implemented.",
        )

    # --- Helper methods for subclasses ---

    @staticmethod
    def score_to_signal(score: float) -> Signal:
        """Convert a -100 to +100 score into a Signal."""
        if score >= 60:
            return Signal.STRONG_BUY
        elif score >= 25:
            return Signal.BUY
        elif score > -25:
            return Signal.HOLD
        elif score > -60:
            return Signal.SELL
        else:
            return Signal.STRONG_SELL

    @staticmethod
    def score_to_confidence(abs_score: float) -> Confidence:
        """Convert absolute score magnitude into confidence."""
        if abs_score >= 70:
            return Confidence.VERY_HIGH
        elif abs_score >= 45:
            return Confidence.HIGH
        elif abs_score >= 20:
            return Confidence.MEDIUM
        else:
            return Confidence.LOW

    @staticmethod
    def pct_from_high(data: MarketData) -> float | None:
        if data.fifty_two_week_high and data.current_price:
            return (data.current_price - data.fifty_two_week_high) / data.fifty_two_week_high * 100
        return None

    @staticmethod
    def pct_from_low(data: MarketData) -> float | None:
        if data.fifty_two_week_low and data.current_price and data.fifty_two_week_low > 0:
            return (data.current_price - data.fifty_two_week_low) / data.fifty_two_week_low * 100
        return None
