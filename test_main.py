import sys
from unittest.mock import MagicMock, patch

# Create mock modules and classes for rich
rich_console_mock = MagicMock()
rich_table_mock = MagicMock()
rich_panel_mock = MagicMock()
rich_progress_mock = MagicMock()

sys.modules["rich"] = MagicMock()
sys.modules["rich.console"] = rich_console_mock
sys.modules["rich.table"] = rich_table_mock
sys.modules["rich.panel"] = rich_panel_mock
sys.modules["rich.progress"] = rich_progress_mock

# Mock other missing dependencies
sys.modules["yfinance"] = MagicMock()
sys.modules["pandas"] = MagicMock()
sys.modules["flask"] = MagicMock()

import unittest

# Now we can import main and other modules that depend on rich
import main
from models import TradeDecision, Confidence

class TestMain(unittest.TestCase):
    @patch('main.analyze_stock')
    def test_single_ticker(self, mock_analyze_stock):
        """Test main.py with a single ticker and default portfolio value."""
        # Setup mock return value
        mock_decision = TradeDecision(
            ticker="AAPL",
            action="BUY",
            quantity=10,
            conviction=Confidence.HIGH,
            reasoning="Strong fundamentals"
        )
        mock_analyze_stock.return_value = mock_decision

        # Mock sys.argv
        with patch.object(sys, 'argv', ['main.py', 'AAPL']):
            main.main()

        mock_analyze_stock.assert_called_once_with('AAPL', 1000000.0)

    @patch('main.analyze_stock')
    def test_multiple_tickers(self, mock_analyze_stock):
        """Test main.py with multiple tickers."""
        # Setup mock return values
        mock_analyze_stock.side_effect = [
            TradeDecision(ticker="AAPL", action="BUY", quantity=10, conviction=Confidence.HIGH, reasoning="Reason 1"),
            TradeDecision(ticker="MSFT", action="HOLD", quantity=0, conviction=Confidence.MEDIUM, reasoning="Reason 2")
        ]

        with patch.object(sys, 'argv', ['main.py', 'AAPL', 'MSFT']):
            main.main()

        self.assertEqual(mock_analyze_stock.call_count, 2)
        mock_analyze_stock.assert_any_call('AAPL', 1000000.0)
        mock_analyze_stock.assert_any_call('MSFT', 1000000.0)

    @patch('main.analyze_stock')
    def test_custom_portfolio_value(self, mock_analyze_stock):
        """Test main.py with a custom portfolio value."""
        mock_decision = TradeDecision(
            ticker="AAPL",
            action="BUY",
            quantity=10,
            conviction=Confidence.HIGH,
            reasoning="Reason"
        )
        mock_analyze_stock.return_value = mock_decision

        with patch.object(sys, 'argv', ['main.py', 'AAPL', '--portfolio', '500000']):
            main.main()

        mock_analyze_stock.assert_called_once_with('AAPL', 500000.0)

if __name__ == '__main__':
    unittest.main()
