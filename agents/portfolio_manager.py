"""Portfolio Manager — combines all signals into a final trading decision."""

from models import AgentSignal, RiskAssessment, TradeDecision, Signal, Confidence


def make_decision(
    ticker: str,
    investor_signals: list[AgentSignal],
    analyst_signals: list[AgentSignal],
    risk: RiskAssessment,
    portfolio_value: float,
    current_price: float,
) -> TradeDecision:
    """Synthesize all signals + risk into a final trading decision."""
    all_signals = investor_signals + analyst_signals

    # Count signals by direction
    strong_buy = [s for s in all_signals if s.signal == Signal.STRONG_BUY]
    buy = [s for s in all_signals if s.signal == Signal.BUY]
    hold = [s for s in all_signals if s.signal == Signal.HOLD]
    sell = [s for s in all_signals if s.signal == Signal.SELL]
    strong_sell = [s for s in all_signals if s.signal == Signal.STRONG_SELL]

    bulls = strong_buy + buy
    bears = sell + strong_sell
    total = len(all_signals)

    bull_pct = len(bulls) / total * 100 if total > 0 else 0
    bear_pct = len(bears) / total * 100 if total > 0 else 0

    # Weighted score: strong signals count double
    weighted_score = (
        len(strong_buy) * 2 + len(buy) * 1
        - len(sell) * 1 - len(strong_sell) * 2
    )

    # Check for special consensus patterns
    value_trio_bullish = all(
        any(s.agent_name == name and s.signal in (Signal.BUY, Signal.STRONG_BUY)
            for s in investor_signals)
        for name in ["Warren Buffett", "Charlie Munger", "Ben Graham"]
    )
    growth_trio_bullish = all(
        any(s.agent_name == name and s.signal in (Signal.BUY, Signal.STRONG_BUY)
            for s in investor_signals)
        for name in ["Cathie Wood", "Phil Fisher", "Stanley Druckenmiller"]
    )
    burry_contrarian = any(
        s.agent_name == "Michael Burry" and s.signal in (Signal.SELL, Signal.STRONG_SELL)
        and bull_pct > 60
        for s in investor_signals
    )

    # Determine action
    if risk.risk_score >= 9:
        action = "HOLD"
        conviction = Confidence.LOW
        reasoning = f"Risk score {risk.risk_score}/10 too high — standing aside regardless of signals."
    elif bull_pct >= 75:
        action = "BUY"
        conviction = Confidence.VERY_HIGH
        reasoning = f"Strong consensus: {len(bulls)}/{total} agents bullish ({bull_pct:.0f}%)."
    elif bull_pct >= 60:
        action = "BUY"
        conviction = Confidence.HIGH
        reasoning = f"Solid consensus: {len(bulls)}/{total} agents bullish ({bull_pct:.0f}%)."
    elif bear_pct >= 75:
        action = "SELL"
        conviction = Confidence.VERY_HIGH
        reasoning = f"Strong bearish consensus: {len(bears)}/{total} agents bearish ({bear_pct:.0f}%)."
    elif bear_pct >= 60:
        action = "SELL"
        conviction = Confidence.HIGH
        reasoning = f"Bearish consensus: {len(bears)}/{total} agents bearish ({bear_pct:.0f}%)."
    elif weighted_score >= 6:
        action = "BUY"
        conviction = Confidence.MEDIUM
        reasoning = f"Leaning bullish (weighted score +{weighted_score}), but not overwhelming consensus."
    elif weighted_score <= -6:
        action = "SELL"
        conviction = Confidence.MEDIUM
        reasoning = f"Leaning bearish (weighted score {weighted_score})."
    else:
        action = "HOLD"
        conviction = Confidence.MEDIUM
        reasoning = f"No clear consensus ({len(bulls)} bullish, {len(hold)} neutral, {len(bears)} bearish)."

    # Boost conviction for special patterns
    if value_trio_bullish and action == "BUY":
        reasoning += " Buffett-Munger-Graham value trio aligned."
        if conviction == Confidence.MEDIUM:
            conviction = Confidence.HIGH
    if growth_trio_bullish and action == "BUY":
        reasoning += " Wood-Fisher-Druckenmiller growth trio aligned."
        if conviction == Confidence.MEDIUM:
            conviction = Confidence.HIGH
    if burry_contrarian and action == "BUY":
        reasoning += " Note: Burry is contrarian — worth monitoring."

    # Risk override: downgrade if risk is elevated
    if risk.risk_score > 7 and conviction in (Confidence.VERY_HIGH, Confidence.HIGH):
        conviction = Confidence.MEDIUM
        reasoning += f" Conviction downgraded due to risk score {risk.risk_score}/10."

    # Position sizing
    conviction_multiplier = {
        Confidence.VERY_HIGH: 1.0,
        Confidence.HIGH: 0.75,
        Confidence.MEDIUM: 0.50,
        Confidence.LOW: 0.25,
    }

    if action in ("BUY", "SELL"):
        position_pct = risk.max_position_size * conviction_multiplier[conviction]
        dollar_amount = portfolio_value * position_pct
        shares = int(dollar_amount / current_price) if current_price > 0 else 0
    else:
        shares = 0

    # Build signal summary
    bull_names = ", ".join(s.agent_name for s in bulls) or "None"
    bear_names = ", ".join(s.agent_name for s in bears) or "None"
    neutral_names = ", ".join(s.agent_name for s in hold) or "None"

    return TradeDecision(
        ticker=ticker,
        action=action,
        quantity=shares,
        conviction=conviction,
        reasoning=reasoning,
        signals_summary={
            "bulls": bull_names,
            "bears": bear_names,
            "neutral": neutral_names,
        },
    )
