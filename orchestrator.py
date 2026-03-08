"""Orchestrator — coordinates all agents to analyze a stock and produce a decision."""

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn

from agents.investors import INVESTOR_AGENTS
from agents.analysts import ANALYST_AGENTS
from agents.risk_manager import assess_risk
from agents.portfolio_manager import make_decision
from data.market_data import fetch_market_data, format_market_data
from models import AgentSignal, TradeDecision, Signal

console = Console()


def display_signals(title: str, signals: list[AgentSignal]):
    """Display agent signals in a rich table."""
    table = Table(title=title, show_header=True, header_style="bold cyan")
    table.add_column("Agent", style="bold", width=22)
    table.add_column("Signal", width=14)
    table.add_column("Confidence", width=12)
    table.add_column("Reasoning", width=60)

    signal_colors = {
        Signal.STRONG_BUY: "bold green",
        Signal.BUY: "green",
        Signal.HOLD: "yellow",
        Signal.SELL: "red",
        Signal.STRONG_SELL: "bold red",
    }

    for s in signals:
        color = signal_colors.get(s.signal, "white")
        table.add_row(
            s.agent_name,
            f"[{color}]{s.signal.value.upper()}[/{color}]",
            s.confidence.value,
            s.reasoning[:80] + "..." if len(s.reasoning) > 80 else s.reasoning,
        )

    console.print(table)
    console.print()


def display_decision(decision: TradeDecision, risk_score: float):
    """Display the final trading decision."""
    action_colors = {"BUY": "green", "SELL": "red", "HOLD": "yellow"}
    color = action_colors.get(decision.action, "white")

    content = (
        f"[bold {color}]{decision.action}[/bold {color}] {decision.ticker}\n\n"
        f"Shares: {decision.quantity}\n"
        f"Conviction: {decision.conviction.value}\n"
        f"Risk Score: {risk_score}/10\n\n"
        f"[bold]Reasoning:[/bold]\n{decision.reasoning}\n\n"
    )

    if decision.signals_summary:
        content += "[bold]Signal Breakdown:[/bold]\n"
        for k, v in decision.signals_summary.items():
            content += f"  {k}: {v}\n"

    console.print(Panel(content, title="FINAL DECISION", border_style=color))


def analyze_stock(ticker: str, portfolio_value: float = 1_000_000) -> TradeDecision:
    """Run the full analysis pipeline for a single stock."""
    console.print(f"\n[bold cyan]{'='*60}[/bold cyan]")
    console.print(f"[bold cyan]  AI HEDGE FUND — Analyzing {ticker.upper()}[/bold cyan]")
    console.print(f"[bold cyan]{'='*60}[/bold cyan]\n")

    # Step 1: Fetch market data
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Fetching market data...", total=None)
        market_data = fetch_market_data(ticker)
        progress.update(task, description="[green]Market data fetched!")

    market_data_text = format_market_data(market_data)
    console.print(Panel(market_data_text, title=f"{ticker.upper()} Market Data", border_style="blue"))
    console.print()

    # Step 2: Run all 12 investor agents
    console.print("[bold]Running 12 Investor Agents...[/bold]")
    investor_signals = [agent.analyze(market_data) for agent in INVESTOR_AGENTS]
    display_signals("Investor Signals", investor_signals)

    # Step 3: Run all 4 analyst agents
    console.print("[bold]Running 4 Analysis Agents...[/bold]")
    analyst_signals = [agent.analyze(market_data) for agent in ANALYST_AGENTS]
    display_signals("Analyst Signals", analyst_signals)

    # Step 4: Risk assessment
    console.print("[bold]Running Risk Manager...[/bold]")
    all_signals = investor_signals + analyst_signals
    risk = assess_risk(market_data, all_signals)

    risk_table = Table(title="Risk Assessment", show_header=False, border_style="red")
    risk_table.add_column("Metric", style="bold")
    risk_table.add_column("Value")
    risk_table.add_row("Risk Score", f"{risk.risk_score}/10")
    risk_table.add_row("Max Position", f"{risk.max_position_size*100:.1f}%")
    risk_table.add_row("VaR (95%)", f"{risk.var_95*100:.1f}%")
    risk_table.add_row("Warnings", ", ".join(risk.warnings) if risk.warnings else "None")
    console.print(risk_table)
    console.print()

    # Step 5: Portfolio manager decision
    console.print("[bold]Running Portfolio Manager...[/bold]")
    decision = make_decision(
        ticker=ticker,
        investor_signals=investor_signals,
        analyst_signals=analyst_signals,
        risk=risk,
        portfolio_value=portfolio_value,
        current_price=market_data.current_price,
    )

    console.print()
    display_decision(decision, risk.risk_score)

    # Summary stats
    buy_count = sum(1 for s in all_signals if s.signal in (Signal.BUY, Signal.STRONG_BUY))
    sell_count = sum(1 for s in all_signals if s.signal in (Signal.SELL, Signal.STRONG_SELL))
    hold_count = sum(1 for s in all_signals if s.signal == Signal.HOLD)

    console.print(f"\n[dim]Consensus: {buy_count} bullish / {hold_count} neutral / {sell_count} bearish out of {len(all_signals)} agents[/dim]")

    return decision
