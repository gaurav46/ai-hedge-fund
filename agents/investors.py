"""12 Investor agents — each uses quantitative rules inspired by a legendary investor."""

import math
from agents.base import BaseAgent
from models import AgentSignal, Signal, Confidence, MarketData


class DamodaranAgent(BaseAgent):
    """Aswath Damodaran — valuation through story + numbers, DCF-minded."""
    name = "Aswath Damodaran"

    def analyze(self, data: MarketData) -> AgentSignal:
        score = 0
        reasons = []

        # PE-based implied growth check
        if data.pe_ratio is not None:
            if data.pe_ratio < 12:
                score += 25
                reasons.append(f"Low P/E ({data.pe_ratio:.1f}) suggests market expects little growth")
            elif data.pe_ratio < 20:
                score += 10
                reasons.append(f"Moderate P/E ({data.pe_ratio:.1f})")
            elif data.pe_ratio > 40:
                score -= 25
                reasons.append(f"High P/E ({data.pe_ratio:.1f}) prices in aggressive growth")
            elif data.pe_ratio > 25:
                score -= 10

        # FCF yield as proxy for DCF attractiveness
        if data.free_cash_flow and data.market_cap and data.market_cap > 0:
            fcf_yield = data.free_cash_flow / data.market_cap * 100
            if fcf_yield > 8:
                score += 30
                reasons.append(f"Strong FCF yield ({fcf_yield:.1f}%) — attractive cash generation")
            elif fcf_yield > 4:
                score += 15
            elif fcf_yield < 0:
                score -= 20
                reasons.append("Negative FCF — burning cash")

        # Revenue growth supports the narrative
        if data.revenue_growth is not None:
            if data.revenue_growth > 0.20:
                score += 15
                reasons.append(f"Strong revenue growth ({data.revenue_growth*100:.0f}%)")
            elif data.revenue_growth < -0.05:
                score -= 15
                reasons.append(f"Revenue declining ({data.revenue_growth*100:.0f}%)")

        # Margin of safety from 52-week high
        pct_high = self.pct_from_high(data)
        if pct_high is not None and pct_high < -25:
            score += 15
            reasons.append(f"Trading {abs(pct_high):.0f}% below 52-week high")

        signal = self.score_to_signal(score)
        confidence = self.score_to_confidence(abs(score))
        return AgentSignal(self.name, signal, confidence, "; ".join(reasons) or "Insufficient data for valuation")


class GrahamAgent(BaseAgent):
    """Ben Graham — classic value, margin of safety, quantitative filters."""
    name = "Ben Graham"

    def analyze(self, data: MarketData) -> AgentSignal:
        score = 0
        reasons = []
        checks_passed = 0
        total_checks = 0

        # Graham filter: P/E < 15
        if data.pe_ratio is not None:
            total_checks += 1
            if data.pe_ratio < 15:
                score += 20
                checks_passed += 1
                reasons.append(f"P/E {data.pe_ratio:.1f} < 15 ✓")
            elif data.pe_ratio > 25:
                score -= 20
                reasons.append(f"P/E {data.pe_ratio:.1f} too high ✗")

        # Graham filter: P/B < 1.5
        if data.pb_ratio is not None:
            total_checks += 1
            if data.pb_ratio < 1.5:
                score += 20
                checks_passed += 1
                reasons.append(f"P/B {data.pb_ratio:.1f} < 1.5 ✓")
            elif data.pb_ratio > 3:
                score -= 20
                reasons.append(f"P/B {data.pb_ratio:.1f} too high ✗")

        # Graham filter: D/E < 0.5
        if data.debt_to_equity is not None:
            total_checks += 1
            if data.debt_to_equity < 50:  # yfinance returns as percentage
                score += 15
                checks_passed += 1
                reasons.append(f"Low debt (D/E {data.debt_to_equity:.0f}%) ✓")
            elif data.debt_to_equity > 100:
                score -= 15
                reasons.append(f"High debt (D/E {data.debt_to_equity:.0f}%) ✗")

        # Dividend yield
        if data.dividend_yield is not None and data.dividend_yield > 0.02:
            score += 15
            reasons.append(f"Dividend yield {data.dividend_yield*100:.1f}% ✓")

        # Positive earnings (P/E exists and is positive)
        if data.pe_ratio is not None and data.pe_ratio > 0:
            score += 5
        elif data.pe_ratio is not None and data.pe_ratio < 0:
            score -= 25
            reasons.append("Negative earnings ✗")

        # Graham is conservative — penalize if fewer than half checks pass
        if total_checks > 0 and checks_passed < total_checks / 2:
            score -= 10

        signal = self.score_to_signal(score)
        confidence = self.score_to_confidence(abs(score))
        return AgentSignal(self.name, signal, confidence,
                           f"Passed {checks_passed}/{total_checks} Graham filters. " + "; ".join(reasons))


class AckmanAgent(BaseAgent):
    """Bill Ackman — activist, concentrated, high-conviction in quality businesses."""
    name = "Bill Ackman"

    def analyze(self, data: MarketData) -> AgentSignal:
        score = 0
        reasons = []

        # Strong FCF generation (Ackman loves FCF machines)
        if data.free_cash_flow and data.market_cap and data.market_cap > 0:
            fcf_yield = data.free_cash_flow / data.market_cap * 100
            if fcf_yield > 6:
                score += 30
                reasons.append(f"Excellent FCF yield ({fcf_yield:.1f}%) — cash machine")
            elif fcf_yield > 3:
                score += 15
            elif fcf_yield < 0:
                score -= 20

        # Profit margins (durable advantage)
        if data.profit_margin is not None:
            if data.profit_margin > 0.20:
                score += 20
                reasons.append(f"High margins ({data.profit_margin*100:.0f}%) suggest pricing power")
            elif data.profit_margin > 0.10:
                score += 10
            elif data.profit_margin < 0:
                score -= 20

        # Activist opportunity: beaten down from highs
        pct_high = self.pct_from_high(data)
        if pct_high is not None:
            if pct_high < -30:
                score += 20
                reasons.append(f"Down {abs(pct_high):.0f}% from high — potential activist opportunity")
            elif pct_high < -15:
                score += 10

        # Ackman avoids high leverage
        if data.debt_to_equity is not None and data.debt_to_equity > 200:
            score -= 15
            reasons.append(f"High leverage (D/E {data.debt_to_equity:.0f}%) — risky")

        signal = self.score_to_signal(score)
        confidence = self.score_to_confidence(abs(score))
        return AgentSignal(self.name, signal, confidence, "; ".join(reasons) or "Neutral positioning")


class WoodAgent(BaseAgent):
    """Cathie Wood — disruptive innovation, high growth, 5-year vision."""
    name = "Cathie Wood"

    DISRUPTIVE_SECTORS = {"Technology", "Healthcare", "Communication Services", "Consumer Cyclical"}

    def analyze(self, data: MarketData) -> AgentSignal:
        score = 0
        reasons = []

        # Sector alignment with innovation themes
        if data.sector in self.DISRUPTIVE_SECTORS:
            score += 15
            reasons.append(f"Sector ({data.sector}) aligns with innovation themes")
        else:
            score -= 10

        # Revenue growth is king for Cathie
        if data.revenue_growth is not None:
            if data.revenue_growth > 0.30:
                score += 35
                reasons.append(f"Explosive growth ({data.revenue_growth*100:.0f}%) — disruptive potential")
            elif data.revenue_growth > 0.15:
                score += 20
                reasons.append(f"Strong growth ({data.revenue_growth*100:.0f}%)")
            elif data.revenue_growth < 0:
                score -= 20
                reasons.append("Revenue declining — not a growth story")

        # Cathie is OK with high P/E for growth
        if data.pe_ratio is not None and data.pe_ratio > 50 and data.revenue_growth and data.revenue_growth > 0.25:
            score += 5  # High P/E acceptable for hypergrowth
            reasons.append("High P/E justified by growth trajectory")
        elif data.pe_ratio is not None and data.pe_ratio < 0:
            # Unprofitable but growing fast is Cathie's sweet spot
            if data.revenue_growth and data.revenue_growth > 0.30:
                score += 10
                reasons.append("Pre-profit disruptor with strong growth")

        # Market cap — Cathie often picks mid-caps with room to grow
        if data.market_cap:
            if 2e9 < data.market_cap < 50e9:
                score += 10
                reasons.append("Mid-cap with room to scale")

        signal = self.score_to_signal(score)
        confidence = self.score_to_confidence(abs(score))
        return AgentSignal(self.name, signal, confidence, "; ".join(reasons) or "Not enough innovation signals")


class MungerAgent(BaseAgent):
    """Charlie Munger — wonderful businesses at fair prices, moats, quality management."""
    name = "Charlie Munger"

    def analyze(self, data: MarketData) -> AgentSignal:
        score = 0
        reasons = []

        # High profit margins = moat indicator
        if data.profit_margin is not None:
            if data.profit_margin > 0.25:
                score += 25
                reasons.append(f"Excellent margins ({data.profit_margin*100:.0f}%) suggest durable moat")
            elif data.profit_margin > 0.15:
                score += 15
            elif data.profit_margin < 0.05:
                score -= 15
                reasons.append("Thin margins — no moat evident")

        # Fair P/E (not cheap, but not crazy)
        if data.pe_ratio is not None:
            if 10 < data.pe_ratio < 25:
                score += 15
                reasons.append(f"Fair P/E ({data.pe_ratio:.1f}) for quality")
            elif data.pe_ratio > 40:
                score -= 20
                reasons.append(f"P/E ({data.pe_ratio:.1f}) too expensive even for quality")
            elif data.pe_ratio < 0:
                score -= 25
                reasons.append("Negative earnings — avoid")

        # Reasonable debt
        if data.debt_to_equity is not None:
            if data.debt_to_equity < 80:
                score += 10
            elif data.debt_to_equity > 150:
                score -= 15
                reasons.append("Too much leverage")

        # Positive FCF
        if data.free_cash_flow and data.free_cash_flow > 0:
            score += 10
        elif data.free_cash_flow and data.free_cash_flow < 0:
            score -= 15

        # Munger has a very high bar
        if score < 30:
            score = min(score, 20)  # caps BUY signals unless very strong

        signal = self.score_to_signal(score)
        confidence = self.score_to_confidence(abs(score))
        return AgentSignal(self.name, signal, confidence, "; ".join(reasons) or "Does not meet quality bar")


class BurryAgent(BaseAgent):
    """Michael Burry — contrarian deep-value, look for what the market is missing."""
    name = "Michael Burry"

    def analyze(self, data: MarketData) -> AgentSignal:
        score = 0
        reasons = []

        # Deep value: very low P/E
        if data.pe_ratio is not None:
            if 0 < data.pe_ratio < 8:
                score += 30
                reasons.append(f"Deep value P/E ({data.pe_ratio:.1f}) — market may be wrong")
            elif 0 < data.pe_ratio < 12:
                score += 15
            elif data.pe_ratio > 35:
                score -= 25
                reasons.append(f"P/E ({data.pe_ratio:.1f}) screams overvaluation")

        # Low P/B — hidden assets
        if data.pb_ratio is not None:
            if data.pb_ratio < 1.0:
                score += 25
                reasons.append(f"Trading below book ({data.pb_ratio:.2f}) — potential hidden value")
            elif data.pb_ratio < 1.5:
                score += 10

        # Contrarian: price near 52-week low
        pct_high = self.pct_from_high(data)
        if pct_high is not None:
            if pct_high < -40:
                score += 25
                reasons.append(f"Down {abs(pct_high):.0f}% from high — contrarian opportunity")
            elif pct_high < -25:
                score += 15
            elif pct_high > -5:
                score -= 15
                reasons.append("Near highs — no contrarian edge")

        # But avoid value traps: check FCF
        if data.free_cash_flow and data.free_cash_flow < 0:
            score -= 15
            reasons.append("Negative FCF — possible value trap")

        # Bearish on hype stocks
        if data.pe_ratio and data.pe_ratio > 50:
            score -= 10

        signal = self.score_to_signal(score)
        confidence = self.score_to_confidence(abs(score))
        return AgentSignal(self.name, signal, confidence, "; ".join(reasons) or "No clear contrarian thesis")


class PabraiAgent(BaseAgent):
    """Mohnish Pabrai — heads I win, tails I don't lose much. Asymmetric bets."""
    name = "Mohnish Pabrai"

    def analyze(self, data: MarketData) -> AgentSignal:
        score = 0
        reasons = []

        # Downside protection: low P/B
        if data.pb_ratio is not None and data.pb_ratio < 1.5:
            score += 20
            reasons.append(f"Low P/B ({data.pb_ratio:.2f}) limits downside")

        # Upside potential: low P/E with growth
        if data.pe_ratio is not None and 0 < data.pe_ratio < 15:
            score += 15
            reasons.append(f"Low P/E ({data.pe_ratio:.1f}) with upside potential")

        if data.revenue_growth is not None and data.revenue_growth > 0.10:
            score += 15
            reasons.append(f"Growth ({data.revenue_growth*100:.0f}%) provides upside")

        # FCF positive = safety net
        if data.free_cash_flow and data.free_cash_flow > 0:
            score += 10
        elif data.free_cash_flow and data.free_cash_flow < 0:
            score -= 20
            reasons.append("Negative FCF — downside not protected")

        # Low debt = limited downside risk
        if data.debt_to_equity is not None:
            if data.debt_to_equity < 50:
                score += 15
                reasons.append("Low debt protects downside")
            elif data.debt_to_equity > 150:
                score -= 15
                reasons.append("High debt adds downside risk")

        # Pabrai checks: is the risk/reward 3:1 or better?
        pct_high = self.pct_from_high(data)
        pct_low = self.pct_from_low(data)
        if pct_high is not None and pct_low is not None:
            upside = abs(pct_high)  # room to recover
            downside = max(pct_low * 0.3, 5)  # estimated further downside
            if upside > 0 and downside > 0 and upside / downside > 3:
                score += 15
                reasons.append(f"Favorable risk/reward ratio (~{upside/downside:.1f}:1)")

        signal = self.score_to_signal(score)
        confidence = self.score_to_confidence(abs(score))
        return AgentSignal(self.name, signal, confidence, "; ".join(reasons) or "Risk/reward not compelling")


class LynchAgent(BaseAgent):
    """Peter Lynch — PEG ratio, invest in what you know, hunt for ten-baggers."""
    name = "Peter Lynch"

    def analyze(self, data: MarketData) -> AgentSignal:
        score = 0
        reasons = []

        # PEG ratio (the Lynch signature metric)
        if data.pe_ratio is not None and data.revenue_growth is not None and data.revenue_growth > 0:
            growth_pct = data.revenue_growth * 100
            if growth_pct > 0:
                peg = data.pe_ratio / growth_pct
                if peg < 0.5:
                    score += 35
                    reasons.append(f"PEG {peg:.2f} < 0.5 — outstanding value for growth")
                elif peg < 1.0:
                    score += 25
                    reasons.append(f"PEG {peg:.2f} < 1.0 — attractive growth at reasonable price")
                elif peg < 1.5:
                    score += 10
                    reasons.append(f"PEG {peg:.2f} — fairly priced")
                elif peg > 2.5:
                    score -= 20
                    reasons.append(f"PEG {peg:.2f} — overpriced for growth rate")

        # Classify: fast grower (revenue growth > 20%)
        if data.revenue_growth is not None:
            if data.revenue_growth > 0.20:
                score += 15
                reasons.append(f"Fast grower ({data.revenue_growth*100:.0f}% growth) — ten-bagger potential")
            elif data.revenue_growth > 0.10:
                score += 5
                reasons.append("Stalwart with steady growth")
            elif data.revenue_growth < -0.05:
                score -= 10

        # Positive earnings
        if data.pe_ratio is not None and data.pe_ratio < 0:
            score -= 20
            reasons.append("No earnings — Lynch avoids money losers")

        # Reasonable debt
        if data.debt_to_equity is not None and data.debt_to_equity > 150:
            score -= 10

        signal = self.score_to_signal(score)
        confidence = self.score_to_confidence(abs(score))
        return AgentSignal(self.name, signal, confidence, "; ".join(reasons) or "No clear ten-bagger setup")


class FisherAgent(BaseAgent):
    """Phil Fisher — long-term growth, R&D-heavy, improving margins."""
    name = "Phil Fisher"

    def analyze(self, data: MarketData) -> AgentSignal:
        score = 0
        reasons = []

        # Revenue growth (Fisher wants sustained growers)
        if data.revenue_growth is not None:
            if data.revenue_growth > 0.15:
                score += 25
                reasons.append(f"Strong growth ({data.revenue_growth*100:.0f}%) — Fisher quality")
            elif data.revenue_growth > 0.05:
                score += 10
            elif data.revenue_growth < 0:
                score -= 20
                reasons.append("Declining revenue — does not fit Fisher criteria")

        # Above-average profit margins
        if data.profit_margin is not None:
            if data.profit_margin > 0.20:
                score += 20
                reasons.append(f"Superior margins ({data.profit_margin*100:.0f}%)")
            elif data.profit_margin > 0.10:
                score += 10
            elif data.profit_margin < 0:
                score -= 15

        # Technology/innovation sector bias
        if data.sector in {"Technology", "Healthcare"}:
            score += 10
            reasons.append(f"Sector ({data.sector}) favors R&D-driven growth")

        # Fisher is long-term, so moderate P/E is acceptable
        if data.pe_ratio is not None:
            if 15 < data.pe_ratio < 35:
                score += 5  # acceptable range for growth
            elif data.pe_ratio > 60:
                score -= 10
                reasons.append("Valuation stretched even for long-term holder")

        # Positive FCF supports reinvestment thesis
        if data.free_cash_flow and data.free_cash_flow > 0:
            score += 10

        signal = self.score_to_signal(score)
        confidence = self.score_to_confidence(abs(score))
        return AgentSignal(self.name, signal, confidence, "; ".join(reasons) or "Does not match Fisher growth criteria")


class JhunjhunwalaAgent(BaseAgent):
    """Rakesh Jhunjhunwala — conviction investing, structural growth, bold bets."""
    name = "Rakesh Jhunjhunwala"

    def analyze(self, data: MarketData) -> AgentSignal:
        score = 0
        reasons = []

        # Revenue growth (structural growth story)
        if data.revenue_growth is not None:
            if data.revenue_growth > 0.20:
                score += 25
                reasons.append(f"High growth ({data.revenue_growth*100:.0f}%) — strong conviction setup")
            elif data.revenue_growth > 0.10:
                score += 15
            elif data.revenue_growth < 0:
                score -= 15

        # Reasonable valuation
        if data.pe_ratio is not None:
            if 0 < data.pe_ratio < 20:
                score += 20
                reasons.append(f"Attractive P/E ({data.pe_ratio:.1f})")
            elif 20 <= data.pe_ratio < 30:
                score += 5
            elif data.pe_ratio > 40:
                score -= 10

        # Profit margins showing execution capability
        if data.profit_margin is not None and data.profit_margin > 0.12:
            score += 15
            reasons.append(f"Healthy margins ({data.profit_margin*100:.0f}%) — management executing")

        # Consumer/Financial sectors (Jhunjhunwala's favorite sectors)
        if data.sector in {"Financial Services", "Consumer Cyclical", "Consumer Defensive"}:
            score += 10
            reasons.append(f"Sector ({data.sector}) — structural consumption growth")

        # Bold in downturns
        pct_high = self.pct_from_high(data)
        if pct_high is not None and pct_high < -30:
            score += 15
            reasons.append(f"Down {abs(pct_high):.0f}% — bold buying opportunity")

        signal = self.score_to_signal(score)
        confidence = self.score_to_confidence(abs(score))
        return AgentSignal(self.name, signal, confidence, "; ".join(reasons) or "No high-conviction setup")


class DruckenmillerAgent(BaseAgent):
    """Stanley Druckenmiller — macro-driven, asymmetric bets, follow liquidity."""
    name = "Stanley Druckenmiller"

    def analyze(self, data: MarketData) -> AgentSignal:
        score = 0
        reasons = []

        # Trend (Druckenmiller respects price trends)
        if data.sma_50 and data.sma_200:
            if data.sma_50 > data.sma_200:
                score += 20
                reasons.append("Golden cross (SMA50 > SMA200) — macro uptrend")
            else:
                score -= 15
                reasons.append("Death cross (SMA50 < SMA200) — macro headwind")

        # Price vs SMA200 (macro trend)
        if data.sma_200 and data.current_price:
            if data.current_price > data.sma_200 * 1.05:
                score += 10
                reasons.append("Trading above SMA200 — positive trend")
            elif data.current_price < data.sma_200 * 0.95:
                score -= 10

        # RSI for timing
        if data.rsi_14 is not None:
            if data.rsi_14 < 35:
                score += 15
                reasons.append(f"RSI {data.rsi_14:.0f} — oversold, potential snap-back")
            elif data.rsi_14 > 70:
                score -= 15
                reasons.append(f"RSI {data.rsi_14:.0f} — overbought, caution")

        # Asymmetry: beaten down but fundamentally intact
        pct_high = self.pct_from_high(data)
        if pct_high is not None and pct_high < -25 and data.profit_margin and data.profit_margin > 0.10:
            score += 20
            reasons.append(f"Down {abs(pct_high):.0f}% but margins healthy — asymmetric setup")

        # Revenue growth as momentum proxy
        if data.revenue_growth is not None and data.revenue_growth > 0.15:
            score += 10
            reasons.append("Revenue acceleration supports momentum thesis")

        signal = self.score_to_signal(score)
        confidence = self.score_to_confidence(abs(score))
        return AgentSignal(self.name, signal, confidence, "; ".join(reasons) or "No clear macro setup")


class BuffettAgent(BaseAgent):
    """Warren Buffett — wonderful companies at fair prices, moats, long-term hold."""
    name = "Warren Buffett"

    def analyze(self, data: MarketData) -> AgentSignal:
        score = 0
        reasons = []

        # Durable competitive advantage: high, stable margins
        if data.profit_margin is not None:
            if data.profit_margin > 0.20:
                score += 25
                reasons.append(f"High margins ({data.profit_margin*100:.0f}%) indicate moat")
            elif data.profit_margin > 0.12:
                score += 10
            elif data.profit_margin < 0:
                score -= 25
                reasons.append("Unprofitable — not Buffett territory")

        # Reasonable P/E (fair price, not necessarily cheap)
        if data.pe_ratio is not None:
            if 10 < data.pe_ratio < 22:
                score += 15
                reasons.append(f"Fair P/E ({data.pe_ratio:.1f})")
            elif data.pe_ratio > 35:
                score -= 15
                reasons.append(f"P/E ({data.pe_ratio:.1f}) too expensive")
            elif data.pe_ratio < 0:
                score -= 20

        # Conservative balance sheet
        if data.debt_to_equity is not None:
            if data.debt_to_equity < 80:
                score += 10
                reasons.append("Conservative debt levels")
            elif data.debt_to_equity > 150:
                score -= 15
                reasons.append("Too much leverage for Buffett's taste")

        # Strong FCF (owner earnings)
        if data.free_cash_flow and data.market_cap and data.market_cap > 0:
            fcf_yield = data.free_cash_flow / data.market_cap * 100
            if fcf_yield > 5:
                score += 20
                reasons.append(f"Strong FCF yield ({fcf_yield:.1f}%) — great owner earnings")
            elif fcf_yield > 2:
                score += 10

        # Dividend (Buffett appreciates cash return)
        if data.dividend_yield and data.dividend_yield > 0.015:
            score += 5

        # Buffett's circle of competence favors stable sectors
        if data.sector in {"Financial Services", "Consumer Defensive", "Industrials", "Energy"}:
            score += 5

        signal = self.score_to_signal(score)
        confidence = self.score_to_confidence(abs(score))
        return AgentSignal(self.name, signal, confidence, "; ".join(reasons) or "Does not pass Buffett's quality filter")


# Registry of all investor agents
INVESTOR_AGENTS = [
    DamodaranAgent(),
    GrahamAgent(),
    AckmanAgent(),
    WoodAgent(),
    MungerAgent(),
    BurryAgent(),
    PabraiAgent(),
    LynchAgent(),
    FisherAgent(),
    JhunjhunwalaAgent(),
    DruckenmillerAgent(),
    BuffettAgent(),
]
