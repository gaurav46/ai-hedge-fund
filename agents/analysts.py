"""4 Analysis agents — each analyzes from a different quantitative angle."""

import math
from agents.base import BaseAgent
from models import AgentSignal, Signal, Confidence, MarketData


class ValuationAgent(BaseAgent):
    """Estimates intrinsic value using multiple valuation methods."""
    name = "Valuation Analyst"

    def analyze(self, data: MarketData) -> AgentSignal:
        score = 0
        reasons = []
        estimates = []

        # Method 1: Graham Number (conservative floor)
        if data.pe_ratio and data.pb_ratio and data.pe_ratio > 0 and data.pb_ratio > 0:
            eps = data.current_price / data.pe_ratio
            bvps = data.current_price / data.pb_ratio
            graham = math.sqrt(22.5 * max(eps, 0) * max(bvps, 0))
            estimates.append(("Graham Number", graham))
            if data.current_price < graham * 0.8:
                score += 25
                reasons.append(f"Below Graham Number (${graham:.2f}) — margin of safety")
            elif data.current_price > graham * 1.3:
                score -= 20
                reasons.append(f"Above Graham Number (${graham:.2f}) — overvalued by this measure")

        # Method 2: FCF Yield valuation
        if data.free_cash_flow and data.market_cap and data.market_cap > 0:
            fcf_yield = data.free_cash_flow / data.market_cap
            # Fair value assuming 5% yield is fair
            if fcf_yield > 0:
                implied_value = data.current_price * (fcf_yield / 0.05)
                estimates.append(("FCF Yield Fair Value", implied_value))
                if fcf_yield > 0.08:
                    score += 25
                    reasons.append(f"FCF yield {fcf_yield*100:.1f}% >> 5% fair yield — undervalued")
                elif fcf_yield > 0.05:
                    score += 10
                elif fcf_yield < 0.02:
                    score -= 15
                    reasons.append(f"FCF yield {fcf_yield*100:.1f}% — expensive")

        # Method 3: Relative P/E valuation
        if data.pe_ratio is not None:
            if 0 < data.pe_ratio < 12:
                score += 20
                reasons.append(f"P/E {data.pe_ratio:.1f} — deep value territory")
            elif 12 <= data.pe_ratio <= 20:
                score += 5
            elif data.pe_ratio > 30:
                score -= 15
                reasons.append(f"P/E {data.pe_ratio:.1f} — premium valuation")
            elif data.pe_ratio > 50:
                score -= 25

        # Method 4: P/B relative
        if data.pb_ratio is not None:
            if data.pb_ratio < 1.0:
                score += 15
                reasons.append(f"P/B {data.pb_ratio:.2f} — below book value")
            elif data.pb_ratio > 5:
                score -= 10

        if estimates:
            avg_est = sum(v for _, v in estimates) / len(estimates)
            gap = (avg_est - data.current_price) / data.current_price * 100
            reasons.append(f"Avg estimated value ${avg_est:.2f} ({gap:+.0f}% vs price)")

        signal = self.score_to_signal(score)
        confidence = self.score_to_confidence(abs(score))
        return AgentSignal(self.name, signal, confidence, "; ".join(reasons) or "Insufficient data for valuation")


class SentimentAgent(BaseAgent):
    """Analyzes market sentiment from price action and technical indicators."""
    name = "Sentiment Analyst"

    def analyze(self, data: MarketData) -> AgentSignal:
        score = 0
        reasons = []

        # RSI sentiment
        if data.rsi_14 is not None:
            if data.rsi_14 < 30:
                score += 30
                reasons.append(f"RSI {data.rsi_14:.0f} — extreme fear/oversold (bullish contrarian)")
            elif data.rsi_14 < 40:
                score += 15
                reasons.append(f"RSI {data.rsi_14:.0f} — fear zone")
            elif data.rsi_14 > 70:
                score -= 25
                reasons.append(f"RSI {data.rsi_14:.0f} — extreme greed/overbought (bearish)")
            elif data.rsi_14 > 60:
                score -= 10
                reasons.append(f"RSI {data.rsi_14:.0f} — greed zone")
            else:
                reasons.append(f"RSI {data.rsi_14:.0f} — neutral sentiment")

        # Price vs moving averages
        ma_bullish = 0
        ma_bearish = 0
        for label, sma in [("SMA20", data.sma_20), ("SMA50", data.sma_50), ("SMA200", data.sma_200)]:
            if sma and data.current_price:
                if data.current_price > sma:
                    ma_bullish += 1
                else:
                    ma_bearish += 1

        if ma_bullish == 3:
            score += 20
            reasons.append("Above all moving averages — bullish trend")
        elif ma_bearish == 3:
            score -= 20
            reasons.append("Below all moving averages — bearish trend")
        elif ma_bullish > ma_bearish:
            score += 5
        elif ma_bearish > ma_bullish:
            score -= 5

        # Distance from 52-week extremes
        pct_high = self.pct_from_high(data)
        pct_low = self.pct_from_low(data)

        if pct_high is not None:
            if pct_high > -3:
                score -= 10
                reasons.append("Near 52-week high — euphoria risk")
            elif pct_high < -40:
                score += 15
                reasons.append(f"Down {abs(pct_high):.0f}% from high — extreme pessimism")

        # 30-day momentum
        if len(data.price_history_30d) >= 5:
            start = data.price_history_30d[0]
            end = data.price_history_30d[-1]
            if start > 0:
                momentum = (end - start) / start * 100
                if momentum > 10:
                    score += 5
                    reasons.append(f"30-day momentum +{momentum:.1f}%")
                elif momentum < -10:
                    score += 10  # contrarian bullish on pullback
                    reasons.append(f"30-day momentum {momentum:.1f}% — sentiment washout")

        signal = self.score_to_signal(score)
        confidence = self.score_to_confidence(abs(score))
        return AgentSignal(self.name, signal, confidence, "; ".join(reasons) or "Mixed sentiment signals")


class FundamentalsAgent(BaseAgent):
    """Evaluates financial health and company performance."""
    name = "Fundamentals Analyst"

    def analyze(self, data: MarketData) -> AgentSignal:
        score = 0
        reasons = []
        grade_points = 0
        grade_count = 0

        # Profitability
        if data.profit_margin is not None:
            grade_count += 1
            if data.profit_margin > 0.20:
                grade_points += 4  # A
                score += 15
                reasons.append(f"Profit margin {data.profit_margin*100:.0f}% (A)")
            elif data.profit_margin > 0.10:
                grade_points += 3  # B
                score += 5
            elif data.profit_margin > 0:
                grade_points += 2  # C
            elif data.profit_margin > -0.10:
                grade_points += 1  # D
                score -= 10
            else:
                score -= 20
                reasons.append(f"Deeply unprofitable ({data.profit_margin*100:.0f}%) (F)")

        # Growth
        if data.revenue_growth is not None:
            grade_count += 1
            if data.revenue_growth > 0.20:
                grade_points += 4
                score += 15
                reasons.append(f"Revenue growth {data.revenue_growth*100:.0f}% (A)")
            elif data.revenue_growth > 0.08:
                grade_points += 3
                score += 5
            elif data.revenue_growth > 0:
                grade_points += 2
            elif data.revenue_growth > -0.10:
                grade_points += 1
                score -= 10
            else:
                score -= 15
                reasons.append(f"Revenue declining {data.revenue_growth*100:.0f}% (F)")

        # Financial health (debt)
        if data.debt_to_equity is not None:
            grade_count += 1
            if data.debt_to_equity < 30:
                grade_points += 4
                score += 10
                reasons.append(f"Very low debt D/E {data.debt_to_equity:.0f}% (A)")
            elif data.debt_to_equity < 80:
                grade_points += 3
                score += 5
            elif data.debt_to_equity < 150:
                grade_points += 2
            elif data.debt_to_equity < 250:
                grade_points += 1
                score -= 10
            else:
                score -= 20
                reasons.append(f"Dangerous leverage D/E {data.debt_to_equity:.0f}% (F)")

        # Cash flow
        if data.free_cash_flow is not None:
            grade_count += 1
            if data.free_cash_flow > 0:
                grade_points += 3
                score += 10
            else:
                grade_points += 1
                score -= 10
                reasons.append("Negative free cash flow")

        # Overall grade
        if grade_count > 0:
            avg_grade = grade_points / grade_count
            grade_letter = {4: "A", 3: "B", 2: "C", 1: "D"}.get(round(avg_grade), "C")
            reasons.insert(0, f"Overall grade: {grade_letter} ({avg_grade:.1f}/4.0)")

        signal = self.score_to_signal(score)
        confidence = self.score_to_confidence(abs(score))
        return AgentSignal(self.name, signal, confidence, "; ".join(reasons) or "Insufficient fundamental data")


class TechnicalsAgent(BaseAgent):
    """Analyzes price trends and technical indicators."""
    name = "Technicals Analyst"

    def analyze(self, data: MarketData) -> AgentSignal:
        score = 0
        reasons = []

        # Trend: Golden Cross / Death Cross
        if data.sma_50 and data.sma_200:
            if data.sma_50 > data.sma_200:
                score += 20
                reasons.append("Golden Cross (SMA50 > SMA200) — bullish trend")
            else:
                score -= 20
                reasons.append("Death Cross (SMA50 < SMA200) — bearish trend")

        # Price vs SMA20 (short-term trend)
        if data.sma_20 and data.current_price:
            if data.current_price > data.sma_20:
                score += 10
                reasons.append("Above SMA20 — short-term bullish")
            else:
                score -= 10
                reasons.append("Below SMA20 — short-term bearish")

        # Price vs SMA200 (long-term trend)
        if data.sma_200 and data.current_price:
            if data.current_price > data.sma_200:
                score += 10
            else:
                score -= 10

        # RSI
        if data.rsi_14 is not None:
            if data.rsi_14 < 30:
                score += 20
                reasons.append(f"RSI {data.rsi_14:.0f} oversold — buy signal")
            elif data.rsi_14 > 70:
                score -= 20
                reasons.append(f"RSI {data.rsi_14:.0f} overbought — sell signal")

        # Support/Resistance proximity
        if data.fifty_two_week_high and data.fifty_two_week_low and data.current_price:
            range_52w = data.fifty_two_week_high - data.fifty_two_week_low
            if range_52w > 0:
                position = (data.current_price - data.fifty_two_week_low) / range_52w
                if position < 0.2:
                    score += 15
                    reasons.append(f"Near 52-week support ({position*100:.0f}% of range)")
                elif position > 0.8:
                    score -= 10
                    reasons.append(f"Near 52-week resistance ({position*100:.0f}% of range)")

        # Volatility compression (SMAs converging → breakout likely)
        if data.sma_20 and data.sma_50 and data.sma_200:
            spread = abs(data.sma_20 - data.sma_50) / data.current_price * 100 if data.current_price else 0
            if spread < 2:
                reasons.append("SMAs converging — potential breakout setup")

        # 30-day price trend
        if len(data.price_history_30d) >= 10:
            first_half = sum(data.price_history_30d[:len(data.price_history_30d)//2]) / (len(data.price_history_30d)//2)
            second_half = sum(data.price_history_30d[len(data.price_history_30d)//2:]) / (len(data.price_history_30d) - len(data.price_history_30d)//2)
            if first_half > 0:
                trend = (second_half - first_half) / first_half * 100
                if trend > 5:
                    score += 10
                    reasons.append(f"Accelerating 30-day uptrend (+{trend:.1f}%)")
                elif trend < -5:
                    score -= 10
                    reasons.append(f"Accelerating 30-day downtrend ({trend:.1f}%)")

        signal = self.score_to_signal(score)
        confidence = self.score_to_confidence(abs(score))
        return AgentSignal(self.name, signal, confidence, "; ".join(reasons) or "Mixed technical signals")


# Registry of all analysis agents
ANALYST_AGENTS = [
    ValuationAgent(),
    SentimentAgent(),
    FundamentalsAgent(),
    TechnicalsAgent(),
]
