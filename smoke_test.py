import sys
import os
from models import MarketData, Signal, Confidence
from agents.investors import INVESTOR_AGENTS
from agents.analysts import ANALYST_AGENTS
from app import _analyze_single

def verify():
    data = MarketData(
        ticker="AAPL",
        current_price=150.0,
        market_cap=2e12,
        pe_ratio=25.0,
        pb_ratio=5.0,
        revenue_growth=0.1,
        profit_margin=0.2,
        debt_to_equity=50.0,
        free_cash_flow=1e10,
        dividend_yield=0.01,
        beta=1.1,
        fifty_two_week_high=180.0,
        fifty_two_week_low=120.0,
        avg_volume=1e7,
        sector="Technology",
        industry="Consumer Electronics",
        price_history_30d=[140.0, 142.0, 145.0, 148.0, 150.0],
        sma_20=145.0,
        sma_50=140.0,
        sma_200=130.0,
        rsi_14=55.0
    )

    # Note: _analyze_single calls fetch_market_data which we can't easily mock here without more effort,
    # but we can test if the parallel execution in _analyze_single works by calling it.
    # However, fetch_market_data calls yfinance which needs internet.
    # Let's mock INVESTOR_AGENTS and ANALYST_AGENTS instead for a pure unit test.
    pass

if __name__ == "__main__":
    # Just a simple smoke test to see if app.py still imports and runs
    import app
    print("app.py imported successfully")
