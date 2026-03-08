"""Market data provider using yfinance."""

from __future__ import annotations
import yfinance as yf
import pandas as pd

from models import MarketData


def _safe_get(info: dict, key: str, default=None):
    val = info.get(key, default)
    if val is None:
        return default
    return val


def compute_rsi(prices: pd.Series, period: int = 14) -> float | None:
    if len(prices) < period + 1:
        return None
    delta = prices.diff()
    gain = delta.where(delta > 0, 0.0).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0.0)).rolling(window=period).mean()
    last_loss = loss.iloc[-1]
    if last_loss == 0:
        return 100.0
    rs = gain.iloc[-1] / last_loss
    return round(100 - (100 / (1 + rs)), 2)


def compute_sma(prices: pd.Series, period: int) -> float | None:
    if len(prices) < period:
        return None
    return round(prices.rolling(window=period).mean().iloc[-1], 2)


def fetch_market_data(ticker: str) -> MarketData:
    """Fetch comprehensive market data for a ticker."""
    stock = yf.Ticker(ticker)
    info = stock.info

    hist_90d = stock.history(period="3mo")
    hist_30d = hist_90d.tail(22) if len(hist_90d) >= 22 else hist_90d

    close_prices = hist_90d["Close"] if not hist_90d.empty else pd.Series()

    hist_200d = stock.history(period="1y")
    close_200 = hist_200d["Close"] if not hist_200d.empty else close_prices

    current_price = _safe_get(info, "currentPrice") or (
        close_prices.iloc[-1] if len(close_prices) > 0 else 0.0
    )

    summary_parts = []
    if _safe_get(info, "longBusinessSummary"):
        summary_parts.append(info["longBusinessSummary"][:500])

    return MarketData(
        ticker=ticker.upper(),
        current_price=round(float(current_price), 2),
        market_cap=_safe_get(info, "marketCap"),
        pe_ratio=_safe_get(info, "trailingPE"),
        pb_ratio=_safe_get(info, "priceToBook"),
        revenue_growth=_safe_get(info, "revenueGrowth"),
        profit_margin=_safe_get(info, "profitMargins"),
        debt_to_equity=_safe_get(info, "debtToEquity"),
        free_cash_flow=_safe_get(info, "freeCashflow"),
        dividend_yield=_safe_get(info, "dividendYield"),
        beta=_safe_get(info, "beta"),
        fifty_two_week_high=_safe_get(info, "fiftyTwoWeekHigh"),
        fifty_two_week_low=_safe_get(info, "fiftyTwoWeekLow"),
        avg_volume=_safe_get(info, "averageVolume"),
        sector=_safe_get(info, "sector"),
        industry=_safe_get(info, "industry"),
        price_history_30d=[round(p, 2) for p in hist_30d["Close"].tolist()] if not hist_30d.empty else [],
        price_history_90d=[round(p, 2) for p in close_prices.tolist()] if len(close_prices) > 0 else [],
        sma_20=compute_sma(close_prices, 20),
        sma_50=compute_sma(close_prices, 50),
        sma_200=compute_sma(close_200, 200),
        rsi_14=compute_rsi(close_prices),
        summary=" ".join(summary_parts),
    )


def format_market_data(data: MarketData) -> str:
    """Format market data into a readable string for agents."""
    def fmt(val, prefix="", suffix="", mult=1):
        if val is None:
            return "N/A"
        return f"{prefix}{val * mult:.2f}{suffix}"

    def fmt_big(val):
        if val is None:
            return "N/A"
        if val >= 1e12:
            return f"${val/1e12:.2f}T"
        if val >= 1e9:
            return f"${val/1e9:.2f}B"
        if val >= 1e6:
            return f"${val/1e6:.2f}M"
        return f"${val:,.0f}"

    lines = [
        f"=== {data.ticker} Market Data ===",
        f"Price: ${data.current_price:.2f}",
        f"Market Cap: {fmt_big(data.market_cap)}",
        f"Sector: {data.sector or 'N/A'} | Industry: {data.industry or 'N/A'}",
        "",
        "--- Valuation ---",
        f"P/E Ratio: {fmt(data.pe_ratio)}",
        f"P/B Ratio: {fmt(data.pb_ratio)}",
        "",
        "--- Fundamentals ---",
        f"Revenue Growth: {fmt(data.revenue_growth, suffix='%', mult=100)}",
        f"Profit Margin: {fmt(data.profit_margin, suffix='%', mult=100)}",
        f"Debt/Equity: {fmt(data.debt_to_equity)}",
        f"Free Cash Flow: {fmt_big(data.free_cash_flow)}",
        f"Dividend Yield: {fmt(data.dividend_yield, suffix='%', mult=100)}",
        f"Beta: {fmt(data.beta)}",
        "",
        "--- Technical ---",
        f"52-Week High: {fmt(data.fifty_two_week_high, prefix='$')}",
        f"52-Week Low: {fmt(data.fifty_two_week_low, prefix='$')}",
        f"SMA 20: {fmt(data.sma_20, prefix='$')}",
        f"SMA 50: {fmt(data.sma_50, prefix='$')}",
        f"SMA 200: {fmt(data.sma_200, prefix='$')}",
        f"RSI (14): {fmt(data.rsi_14)}",
        f"Avg Volume: {data.avg_volume:,.0f}" if data.avg_volume else "Avg Volume: N/A",
    ]

    if data.price_history_30d:
        lines.append(f"\n30-Day Price Range: ${min(data.price_history_30d):.2f} - ${max(data.price_history_30d):.2f}")

    if data.summary:
        lines.append(f"\nBusiness: {data.summary[:300]}")

    return "\n".join(lines)
