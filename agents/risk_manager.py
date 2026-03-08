"""Risk Manager — calculates risk metrics and position limits using quantitative rules."""

from models import AgentSignal, RiskAssessment, MarketData, Signal


def assess_risk(market_data: MarketData, signals: list[AgentSignal]) -> RiskAssessment:
    """Assess risk for a potential position using quantitative rules."""
    risk_score = 0.0
    warnings: list[str] = []

    # 1. Volatility risk (beta)
    if market_data.beta is not None:
        if market_data.beta > 2.0:
            risk_score += 2.5
            warnings.append(f"Very high beta ({market_data.beta:.2f}) — extreme volatility")
        elif market_data.beta > 1.5:
            risk_score += 1.5
            warnings.append(f"High beta ({market_data.beta:.2f})")
        elif market_data.beta > 1.0:
            risk_score += 0.5
        # Low beta reduces risk
        elif market_data.beta < 0.5:
            risk_score -= 0.5

    # 2. Price range risk (52-week range as % of price)
    if market_data.fifty_two_week_high and market_data.fifty_two_week_low:
        price_range = market_data.fifty_two_week_high - market_data.fifty_two_week_low
        if market_data.fifty_two_week_low > 0:
            range_pct = price_range / market_data.fifty_two_week_low * 100
            if range_pct > 100:
                risk_score += 2.0
                warnings.append(f"52-week range is {range_pct:.0f}% — very volatile")
            elif range_pct > 60:
                risk_score += 1.0

    # 3. Financial risk (leverage)
    if market_data.debt_to_equity is not None:
        if market_data.debt_to_equity > 200:
            risk_score += 2.0
            warnings.append(f"Very high leverage (D/E {market_data.debt_to_equity:.0f}%)")
        elif market_data.debt_to_equity > 100:
            risk_score += 1.0
        elif market_data.debt_to_equity < 30:
            risk_score -= 0.5

    # 4. Cash flow risk
    if market_data.free_cash_flow is not None:
        if market_data.free_cash_flow < 0:
            risk_score += 1.5
            warnings.append("Negative free cash flow — liquidity risk")
    else:
        risk_score += 0.5  # unknown is slightly risky

    # 5. Valuation risk
    if market_data.pe_ratio is not None:
        if market_data.pe_ratio > 60:
            risk_score += 1.5
            warnings.append(f"Very high P/E ({market_data.pe_ratio:.1f}) — priced for perfection")
        elif market_data.pe_ratio > 35:
            risk_score += 0.5
        elif market_data.pe_ratio < 0:
            risk_score += 1.0
            warnings.append("Negative earnings")

    # 6. Margin risk
    if market_data.profit_margin is not None and market_data.profit_margin < 0:
        risk_score += 1.0
        warnings.append(f"Unprofitable (margin {market_data.profit_margin*100:.0f}%)")

    # 7. RSI extreme risk
    if market_data.rsi_14 is not None:
        if market_data.rsi_14 > 80 or market_data.rsi_14 < 20:
            risk_score += 0.5
            warnings.append(f"RSI at extreme ({market_data.rsi_14:.0f}) — timing risk")

    # 8. Signal disagreement risk
    buy_count = sum(1 for s in signals if s.signal in (Signal.BUY, Signal.STRONG_BUY))
    sell_count = sum(1 for s in signals if s.signal in (Signal.SELL, Signal.STRONG_SELL))
    total = len(signals) if signals else 1
    disagreement = min(buy_count, sell_count) / total
    if disagreement > 0.3:
        risk_score += 1.0
        warnings.append(f"High signal disagreement ({buy_count} bullish vs {sell_count} bearish)")

    # Clamp risk score to 0-10
    risk_score = max(0, min(10, risk_score))

    # Position sizing based on risk
    if risk_score <= 3:
        max_position = 0.10
    elif risk_score <= 5:
        max_position = 0.06
    elif risk_score <= 7:
        max_position = 0.03
    elif risk_score <= 8:
        max_position = 0.02
    else:
        max_position = 0.01

    # VaR estimate (simplified: beta * base vol * 1.65 for 95%)
    beta = market_data.beta if market_data.beta else 1.0
    base_monthly_vol = 0.05  # assume ~5% monthly vol for avg stock
    var_95 = beta * base_monthly_vol * 1.65

    return RiskAssessment(
        max_position_size=max_position,
        risk_score=round(risk_score, 1),
        var_95=round(var_95, 4),
        warnings=warnings,
    )
