#!/usr/bin/env python3
"""
AI Hedge Fund — Multi-Agent Trading Decision System

An orchestrator of 18 AI agents that analyze markets, generate trade ideas,
and work together to make trading decisions.

Usage:
    python main.py AAPL                      # Analyze a single stock
    python main.py AAPL GOOGL MSFT           # Analyze multiple stocks
    python main.py AAPL --portfolio 500000   # Set portfolio value
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import argparse

from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from orchestrator import analyze_stock
from models import TradeDecision

console = Console()

BANNER = r"""
[bold cyan]
     █████╗ ██╗    ██╗  ██╗███████╗██████╗  ██████╗ ███████╗
    ██╔══██╗██║    ██║  ██║██╔════╝██╔══██╗██╔════╝ ██╔════╝
    ███████║██║    ███████║█████╗  ██║  ██║██║  ███╗█████╗
    ██╔══██║██║    ██╔══██║██╔══╝  ██║  ██║██║   ██║██╔══╝
    ██║  ██║██║    ██║  ██║███████╗██████╔╝╚██████╔╝███████╗
    ╚═╝  ╚═╝╚═╝    ╚═╝  ╚═╝╚══════╝╚═════╝  ╚═════╝ ╚══════╝
        ███████╗██╗   ██╗███╗   ██╗██████╗
        ██╔════╝██║   ██║████╗  ██║██╔══██╗
        █████╗  ██║   ██║██╔██╗ ██║██║  ██║
        ██╔══╝  ██║   ██║██║╚██╗██║██║  ██║
        ██║     ╚██████╔╝██║ ╚████║██████╔╝
        ╚═╝      ╚═════╝ ╚═╝  ╚═══╝╚═════╝
[/bold cyan]
[dim]  18 AI Agents  |  12 Investor Styles  |  4 Analysts  |  Risk + Portfolio Mgmt[/dim]
"""


def main():
    parser = argparse.ArgumentParser(
        description="AI Hedge Fund — Multi-Agent Trading Decision System"
    )
    parser.add_argument(
        "tickers",
        nargs="+",
        help="Stock ticker(s) to analyze (e.g., AAPL GOOGL MSFT)",
    )
    parser.add_argument(
        "--portfolio",
        type=float,
        default=1_000_000,
        help="Portfolio value in USD (default: $1,000,000)",
    )

    args = parser.parse_args()

    console.print(BANNER)

    console.print(f"[bold]Portfolio Value:[/bold] ${args.portfolio:,.0f}")
    console.print(f"[bold]Analyzing:[/bold] {', '.join(t.upper() for t in args.tickers)}")
    console.print()

    decisions: list[TradeDecision] = []

    for ticker in args.tickers:
        decision = analyze_stock(ticker.upper(), args.portfolio)
        decisions.append(decision)
        console.print()

    # Summary table for multi-stock analysis
    if len(decisions) > 1:
        console.print(f"\n[bold cyan]{'='*60}[/bold cyan]")
        console.print(f"[bold cyan]  PORTFOLIO SUMMARY[/bold cyan]")
        console.print(f"[bold cyan]{'='*60}[/bold cyan]\n")

        summary = Table(title="Trading Decisions", show_header=True, header_style="bold cyan")
        summary.add_column("Ticker", style="bold", width=10)
        summary.add_column("Action", width=10)
        summary.add_column("Shares", width=10)
        summary.add_column("Conviction", width=12)
        summary.add_column("Reasoning", width=50)

        action_colors = {"BUY": "green", "SELL": "red", "HOLD": "yellow"}

        for d in decisions:
            color = action_colors.get(d.action, "white")
            summary.add_row(
                d.ticker,
                f"[{color}]{d.action}[/{color}]",
                str(d.quantity),
                d.conviction.value,
                d.reasoning[:60] + "..." if len(d.reasoning) > 60 else d.reasoning,
            )

        console.print(summary)

    console.print("\n[dim]Disclaimer: This is a simulation for educational purposes only. Not financial advice.[/dim]\n")


if __name__ == "__main__":
    main()
