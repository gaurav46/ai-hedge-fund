"""Alpha Vantage data provider."""

from __future__ import annotations
import time
import requests

from config import ALPHA_VANTAGE_API_KEY, ALPHA_VANTAGE_BASE_URL
from models import MarketData

# --- Simple in-memory cache ---
_cache: dict[str, tuple[float, any]] = {}
_CACHE_TTL = 300  # 5 minutes


def _get_cached(key: str):
    if key in _cache:
        ts, data = _cache[key]
        if time.time() - ts < _CACHE_TTL:
            return data
        del _cache[key]
    return None


def _set_cache(key: str, data):
    _cache[key] = (time.time(), data)


# --- Rate limiter ---
_last_call_time = 0.0
_MIN_INTERVAL = 1.3  # seconds between API calls


def _rate_limited_get(params: dict) -> dict:
    """Make a rate-limited GET request to Alpha Vantage."""
    global _last_call_time

    cache_key = str(sorted(params.items()))
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    elapsed = time.time() - _last_call_time
    if elapsed < _MIN_INTERVAL:
        time.sleep(_MIN_INTERVAL - elapsed)

    params["apikey"] = ALPHA_VANTAGE_API_KEY
    resp = requests.get(ALPHA_VANTAGE_BASE_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    _last_call_time = time.time()

    if "Error Message" in data:
        raise ValueError(f"Alpha Vantage error: {data['Error Message']}")
    if "Note" in data:
        raise ValueError(f"Alpha Vantage rate limit: {data['Note']}")

    _set_cache(cache_key, data)
    return data


def _safe_float(val, default=None) -> float | None:
    """Safely convert a string to float, handling 'None' and '-'."""
    if val is None or val == "None" or val == "-" or val == "":
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _local_sma(prices: list[float], period: int) -> float | None:
    if len(prices) < period:
        return None
    return round(sum(prices[-period:]) / period, 2)


def _local_rsi(prices: list[float], period: int = 14) -> float | None:
    if len(prices) < period + 1:
        return None
    deltas = [prices[i] - prices[i - 1] for i in range(1, len(prices))]
    gains = [d if d > 0 else 0 for d in deltas[-period:]]
    losses = [-d if d < 0 else 0 for d in deltas[-period:]]
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def _local_ema(prices: list[float], period: int) -> float | None:
    if len(prices) < period:
        return None
    multiplier = 2 / (period + 1)
    ema = sum(prices[:period]) / period
    for p in prices[period:]:
        ema = (p - ema) * multiplier + ema
    return round(ema, 2)


def fetch_market_data_av(ticker: str) -> MarketData:
    """Fetch market data from Alpha Vantage and return a MarketData object."""
    ticker = ticker.upper()

    # --- API Call 1: GLOBAL_QUOTE ---
    quote_data = _rate_limited_get({
        "function": "GLOBAL_QUOTE",
        "symbol": ticker,
    })
    gq = quote_data.get("Global Quote", {})
    current_price = _safe_float(gq.get("05. price"), 0.0)

    # --- API Call 2: OVERVIEW ---
    overview = _rate_limited_get({
        "function": "OVERVIEW",
        "symbol": ticker,
    })

    # --- API Call 3: TIME_SERIES_DAILY ---
    daily_data = _rate_limited_get({
        "function": "TIME_SERIES_DAILY",
        "symbol": ticker,
        "outputsize": "compact",
    })
    ts_daily = daily_data.get("Time Series (Daily)", {})

    sorted_dates = sorted(ts_daily.keys(), reverse=True)

    ohlcv_90d = []
    close_prices_90d = []
    volume_history_90d = []
    date_labels_90d = []

    chart_dates = sorted_dates[:90]
    chart_dates.reverse()  # chronological

    for d in chart_dates:
        bar = ts_daily[d]
        o = _safe_float(bar.get("1. open"))
        h = _safe_float(bar.get("2. high"))
        l = _safe_float(bar.get("3. low"))
        c = _safe_float(bar.get("4. close"))
        v = _safe_float(bar.get("5. volume"))

        ohlcv_90d.append({
            "date": d, "open": o, "high": h, "low": l, "close": c, "volume": v
        })
        if c is not None:
            close_prices_90d.append(round(c, 2))
        if v is not None:
            volume_history_90d.append(v)
        date_labels_90d.append(d)

    price_history_30d = close_prices_90d[-22:] if len(close_prices_90d) >= 22 else close_prices_90d
    price_history_90d = close_prices_90d

    # Compute indicators locally from daily close prices
    sma_20 = _local_sma(close_prices_90d, 20)
    sma_50 = _local_sma(close_prices_90d, 50)
    sma_200 = _local_sma(close_prices_90d, 200)  # None if < 200 points
    rsi_14 = _local_rsi(close_prices_90d)
    ema_20 = _local_ema(close_prices_90d, 20)
    ema_50 = _local_ema(close_prices_90d, 50)

    # Rolling RSI history for chart
    rsi_history = []
    for i in range(len(close_prices_90d)):
        if i < 15:
            rsi_history.append(None)
        else:
            rsi_history.append(_local_rsi(close_prices_90d[: i + 1]))

    # --- API Call 4: MACD ---
    try:
        macd_raw = _rate_limited_get({
            "function": "MACD",
            "symbol": ticker,
            "interval": "daily",
            "series_type": "close",
        })
        macd_ta = macd_raw.get("Technical Analysis: MACD", {})
        macd_dates_sorted = sorted(macd_ta.keys())[-90:]
        macd_data = {
            "macd": [_safe_float(macd_ta[d].get("MACD")) for d in macd_dates_sorted],
            "signal": [_safe_float(macd_ta[d].get("MACD_Signal")) for d in macd_dates_sorted],
            "histogram": [_safe_float(macd_ta[d].get("MACD_Hist")) for d in macd_dates_sorted],
            "dates": macd_dates_sorted,
        }
    except Exception:
        macd_data = None

    # --- API Call 5: BBANDS ---
    try:
        bbands_raw = _rate_limited_get({
            "function": "BBANDS",
            "symbol": ticker,
            "interval": "daily",
            "time_period": "20",
            "series_type": "close",
        })
        bbands_ta = bbands_raw.get("Technical Analysis: BBANDS", {})
        bbands_dates = sorted(bbands_ta.keys())[-90:]
        bollinger_bands = {
            "upper": [_safe_float(bbands_ta[d].get("Real Upper Band")) for d in bbands_dates],
            "middle": [_safe_float(bbands_ta[d].get("Real Middle Band")) for d in bbands_dates],
            "lower": [_safe_float(bbands_ta[d].get("Real Lower Band")) for d in bbands_dates],
            "dates": bbands_dates,
        }
    except Exception:
        bollinger_bands = None

    # --- API Call 6: ADX ---
    adx_val = None
    try:
        adx_raw = _rate_limited_get({
            "function": "ADX",
            "symbol": ticker,
            "interval": "daily",
            "time_period": "14",
        })
        adx_ta = adx_raw.get("Technical Analysis: ADX", {})
        adx_dates = sorted(adx_ta.keys())
        if adx_dates:
            adx_val = _safe_float(adx_ta[adx_dates[-1]].get("ADX"))
    except Exception:
        pass

    return MarketData(
        ticker=ticker,
        current_price=round(current_price, 2),
        market_cap=_safe_float(overview.get("MarketCapitalization")),
        pe_ratio=_safe_float(overview.get("TrailingPE")),
        pb_ratio=_safe_float(overview.get("PriceToBookRatio")),
        revenue_growth=_safe_float(overview.get("QuarterlyRevenueGrowthYOY")),
        profit_margin=_safe_float(overview.get("ProfitMargin")),
        debt_to_equity=None,
        free_cash_flow=None,
        dividend_yield=_safe_float(overview.get("DividendYield")),
        beta=_safe_float(overview.get("Beta")),
        fifty_two_week_high=_safe_float(overview.get("52WeekHigh")),
        fifty_two_week_low=_safe_float(overview.get("52WeekLow")),
        avg_volume=_safe_float(gq.get("06. volume")),
        sector=overview.get("Sector"),
        industry=overview.get("Industry"),
        price_history_30d=price_history_30d,
        price_history_90d=price_history_90d,
        sma_20=sma_20,
        sma_50=sma_50,
        sma_200=sma_200,
        rsi_14=rsi_14,
        summary=overview.get("Description", "")[:500],
        # Rich chart data
        ohlcv_90d=ohlcv_90d,
        volume_history_90d=volume_history_90d,
        date_labels_90d=date_labels_90d,
        macd_data=macd_data,
        bollinger_bands=bollinger_bands,
        ema_20=ema_20,
        ema_50=ema_50,
        adx=adx_val,
        rsi_history=rsi_history,
        eps=_safe_float(overview.get("EPS")),
        forward_pe=_safe_float(overview.get("ForwardPE")),
        peg_ratio=_safe_float(overview.get("PEGRatio")),
        book_value=_safe_float(overview.get("BookValue")),
        ev_to_ebitda=_safe_float(overview.get("EVToEBITDA")),
        return_on_equity=_safe_float(overview.get("ReturnOnEquityTTM")),
        return_on_assets=_safe_float(overview.get("ReturnOnAssetsTTM")),
        quarterly_revenue_growth_yoy=_safe_float(overview.get("QuarterlyRevenueGrowthYOY")),
        quarterly_earnings_growth_yoy=_safe_float(overview.get("QuarterlyEarningsGrowthYOY")),
        provider="alphavantage",
    )
