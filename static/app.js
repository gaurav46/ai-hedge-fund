// === AI Hedge Fund Dashboard — Multi-Ticker + Alpha Vantage ===

let priceChart = null;
let signalChart = null;
let comparisonChart = null;
let riskCompChart = null;

// Rich chart instances (Alpha Vantage)
let candlestickChartObj = null;
let bollingerChartObj = null;
let rsiChartObj = null;
let macdChartObj = null;
let volumeChartObj = null;

// All results stored for tab switching
let allResults = [];
let activeTickerIdx = 0;

// Provider state — default is Alpha Vantage (unchecked = alphavantage, checked = yfinance)
let currentProvider = 'alphavantage';

function onProviderToggle() {
    const checked = document.getElementById('providerToggle').checked;
    currentProvider = checked ? 'yfinance' : 'alphavantage';
    document.getElementById('providerLabel').textContent =
        checked ? 'Yahoo Finance' : 'Alpha Vantage';
}

// Enter key triggers analysis
document.getElementById('tickerInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runAnalysis();
});

function parseTickers(input) {
    return input
        .toUpperCase()
        .split(/[\s,;]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0 && /^[A-Z0-9.]+$/.test(t));
}

function runAnalysis() {
    const raw = document.getElementById('tickerInput').value.trim();
    const portfolio = parseFloat(document.getElementById('portfolioInput').value) || 5000;
    const tickers = parseTickers(raw);

    if (tickers.length === 0) return;

    // Reset UI
    document.getElementById('landing').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('portfolioSummary').classList.add('hidden');
    document.getElementById('tickerTabs').classList.add('hidden');
    document.getElementById('errorMsg').classList.add('hidden');
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('analyzeBtn').disabled = true;

    const isMulti = tickers.length > 1;
    const providerNote = currentProvider === 'alphavantage'
        ? ' via Alpha Vantage (this may take a moment)' : '';

    document.getElementById('loadingText').textContent =
        isMulti
            ? `Analyzing ${tickers.length} tickers${providerNote}...`
            : `18 agents analyzing ${tickers[0]}${providerNote}...`;
    document.getElementById('loadingProgress').textContent = '';

    if (isMulti) {
        runBatchAnalysis(tickers, portfolio);
    } else {
        runSingleAnalysis(tickers[0], portfolio);
    }
}

function runSingleAnalysis(ticker, portfolio) {
    fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, portfolio_value: portfolio, provider: currentProvider }),
    })
    .then(r => r.json().then(data => ({ ok: r.ok, data })))
    .then(({ ok, data }) => {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('analyzeBtn').disabled = false;

        if (!ok) {
            showError(data.error || 'Analysis failed');
            return;
        }

        allResults = [data];
        activeTickerIdx = 0;
        document.getElementById('portfolioSummary').classList.add('hidden');
        document.getElementById('tickerTabs').classList.add('hidden');
        renderDashboard(data);
    })
    .catch(err => {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('analyzeBtn').disabled = false;
        showError('Network error: ' + err.message);
    });
}

function runBatchAnalysis(tickers, portfolio) {
    fetch('/api/analyze_batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers, portfolio_value: portfolio, provider: currentProvider }),
    })
    .then(r => r.json().then(data => ({ ok: r.ok, data })))
    .then(({ ok, data }) => {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('analyzeBtn').disabled = false;

        if (!ok) {
            showError(data.error || 'Batch analysis failed');
            return;
        }

        allResults = data.results || [];
        const errors = data.errors || [];

        if (allResults.length === 0) {
            showError('No tickers could be analyzed.');
            return;
        }

        activeTickerIdx = 0;
        renderPortfolioSummary(allResults, errors);
        renderTickerTabs(allResults);
        renderDashboard(allResults[0]);
    })
    .catch(err => {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('analyzeBtn').disabled = false;
        showError('Network error: ' + err.message);
    });
}

function showError(msg) {
    document.getElementById('errorMsg').textContent = msg;
    document.getElementById('errorMsg').classList.remove('hidden');
}

// === Portfolio Summary ===

function renderPortfolioSummary(results, errors) {
    document.getElementById('portfolioSummary').classList.remove('hidden');

    const tbody = document.getElementById('summaryBody');
    tbody.innerHTML = results.map((r, i) => {
        const d = r.decision;
        const m = r.market_data;
        const c = r.consensus;
        const actionClass = d.action.toLowerCase();
        return `
        <tr class="${i === 0 ? 'active-row' : ''}" onclick="switchToTicker(${i})">
            <td><strong>${r.ticker}</strong></td>
            <td>$${m.current_price.toFixed(2)}</td>
            <td class="action-cell ${actionClass}">${d.action}</td>
            <td>${d.quantity.toLocaleString()}</td>
            <td>${d.conviction.replace('_', ' ')}</td>
            <td>${r.risk.risk_score}/10</td>
            <td style="color:var(--green)">${c.bullish}</td>
            <td style="color:var(--red)">${c.bearish}</td>
            <td>${m.sector || 'N/A'}</td>
        </tr>`;
    }).join('');

    const errEl = document.getElementById('summaryErrors');
    errEl.innerHTML = errors.map(e =>
        `<div class="error-item">Failed: ${e.ticker} — ${e.error}</div>`
    ).join('');

    renderComparisonChart(results);
    renderRiskCompChart(results);
}

function renderComparisonChart(results) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    if (comparisonChart) comparisonChart.destroy();

    const labels = results.map(r => r.ticker);
    const bullish = results.map(r => r.consensus.bullish);
    const neutral = results.map(r => r.consensus.neutral);
    const bearish = results.map(r => -r.consensus.bearish);

    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Bullish', data: bullish, backgroundColor: '#22c55e' },
                { label: 'Neutral', data: neutral, backgroundColor: '#eab308' },
                { label: 'Bearish', data: bearish, backgroundColor: '#ef4444' },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#94a3b8', font: { size: 12 } }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    stacked: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

function renderRiskCompChart(results) {
    const ctx = document.getElementById('riskCompChart').getContext('2d');
    if (riskCompChart) riskCompChart.destroy();

    const labels = results.map(r => r.ticker);
    const riskScores = results.map(r => r.risk.risk_score);

    const barColors = riskScores.map(s => {
        if (s <= 3) return '#22c55e';
        if (s <= 6) return '#eab308';
        return '#ef4444';
    });

    riskCompChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Risk Score',
                data: riskScores,
                backgroundColor: barColors,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    min: 0,
                    max: 10,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8', stepSize: 2 }
                }
            }
        }
    });
}

// === Ticker Tabs ===

function renderTickerTabs(results) {
    const container = document.getElementById('tickerTabs');
    container.classList.remove('hidden');
    container.innerHTML = results.map((r, i) => {
        const action = r.decision.action.toLowerCase();
        return `
        <div class="ticker-tab ${i === 0 ? 'active' : ''}" onclick="switchToTicker(${i})" id="tab-${i}">
            ${r.ticker}
            <span class="tab-signal ${action}">${r.decision.action}</span>
        </div>`;
    }).join('');
}

function switchToTicker(idx) {
    if (idx < 0 || idx >= allResults.length) return;
    activeTickerIdx = idx;

    document.querySelectorAll('.ticker-tab').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
    });

    document.querySelectorAll('#summaryBody tr').forEach((el, i) => {
        el.classList.toggle('active-row', i === idx);
    });

    renderDashboard(allResults[idx]);
}

// === Helpers ===

function fmt(val, prefix, suffix, mult) {
    if (val === null || val === undefined) return 'N/A';
    const v = mult ? val * mult : val;
    return (prefix || '') + v.toFixed(2) + (suffix || '');
}

function fmtBig(val) {
    if (val === null || val === undefined) return 'N/A';
    if (val >= 1e12) return '$' + (val / 1e12).toFixed(2) + 'T';
    if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
    if (val >= 1e6) return '$' + (val / 1e6).toFixed(2) + 'M';
    return '$' + val.toLocaleString();
}

// === Render single-ticker detail dashboard ===

function renderDashboard(data) {
    const d = data.decision;
    const m = data.market_data;
    const r = data.risk;
    const c = data.consensus;

    // Destroy rich charts
    if (candlestickChartObj) { candlestickChartObj.destroy(); candlestickChartObj = null; }
    if (bollingerChartObj) { bollingerChartObj.destroy(); bollingerChartObj = null; }
    if (rsiChartObj) { rsiChartObj.destroy(); rsiChartObj = null; }
    if (macdChartObj) { macdChartObj.destroy(); macdChartObj = null; }
    if (volumeChartObj) { volumeChartObj.destroy(); volumeChartObj = null; }

    document.getElementById('dashboard').classList.remove('hidden');

    // === Decision Card ===
    const card = document.getElementById('decisionCard');
    card.className = 'card decision-card ' + d.action.toLowerCase();

    const actionEl = document.getElementById('decisionAction');
    actionEl.textContent = d.action;
    actionEl.className = 'decision-action ' + d.action.toLowerCase();

    document.getElementById('decisionTicker').textContent = data.ticker;
    document.getElementById('decisionShares').textContent = d.quantity.toLocaleString();
    document.getElementById('decisionConviction').textContent = d.conviction.replace('_', ' ');
    document.getElementById('decisionRisk').textContent = r.risk_score + '/10';
    document.getElementById('decisionReasoning').textContent = d.reasoning;

    // === Market Data ===
    document.getElementById('mktTicker').textContent = data.ticker;
    document.getElementById('mktPrice').textContent = '$' + m.current_price.toFixed(2);
    document.getElementById('mktCap').textContent = fmtBig(m.market_cap);
    document.getElementById('mktPE').textContent = fmt(m.pe_ratio);
    document.getElementById('mktPB').textContent = fmt(m.pb_ratio);
    document.getElementById('mktGrowth').textContent = m.revenue_growth !== null ? (m.revenue_growth * 100).toFixed(1) + '%' : 'N/A';
    document.getElementById('mktMargin').textContent = m.profit_margin !== null ? (m.profit_margin * 100).toFixed(1) + '%' : 'N/A';
    document.getElementById('mktDE').textContent = fmt(m.debt_to_equity);
    document.getElementById('mktFCF').textContent = fmtBig(m.free_cash_flow);
    document.getElementById('mktDiv').textContent = m.dividend_yield !== null ? (m.dividend_yield * 100).toFixed(2) + '%' : 'N/A';
    document.getElementById('mktBeta').textContent = fmt(m.beta);
    document.getElementById('mkt52H').textContent = fmt(m.fifty_two_week_high, '$');
    document.getElementById('mkt52L').textContent = fmt(m.fifty_two_week_low, '$');
    document.getElementById('mktRSI').textContent = fmt(m.rsi_14);
    document.getElementById('mktSector').textContent = m.sector || 'N/A';

    // === Risk Gauge ===
    drawRiskGauge(r.risk_score);
    document.getElementById('riskScoreLabel').textContent = r.risk_score + '/10';
    document.getElementById('riskPos').textContent = (r.max_position_size * 100).toFixed(1) + '%';
    document.getElementById('riskVar').textContent = (r.var_95 * 100).toFixed(1) + '%';

    const warningsEl = document.getElementById('riskWarnings');
    warningsEl.innerHTML = r.warnings.length
        ? r.warnings.map(w => `<div class="warning-item">&#9888; ${w}</div>`).join('')
        : '';

    // === Consensus Bar ===
    const total = c.total || 1;
    document.getElementById('conBull').textContent = c.bullish + ' Bullish';
    document.getElementById('conNeut').textContent = c.neutral + ' Neutral';
    document.getElementById('conBear').textContent = c.bearish + ' Bearish';
    document.getElementById('barBull').style.width = (c.bullish / total * 100) + '%';
    document.getElementById('barNeut').style.width = (c.neutral / total * 100) + '%';
    document.getElementById('barBear').style.width = (c.bearish / total * 100) + '%';

    // === Price Chart (with real dates if available) ===
    const dateLabels = m.date_labels_90d && m.date_labels_90d.length > 0
        ? m.date_labels_90d.slice(-22) : null;
    renderPriceChart(m.price_history_30d, dateLabels);

    // === Signal Distribution Chart ===
    const allSignals = [...data.investor_signals, ...data.analyst_signals];
    renderSignalChart(allSignals);

    // === Rich Charts (Alpha Vantage only) ===
    const hasRichData = m.ohlcv_90d && m.ohlcv_90d.length > 0;
    const richSection = document.getElementById('richChartsSection');
    if (hasRichData) {
        richSection.classList.remove('hidden');
        renderCandlestickChart(m.ohlcv_90d);
        if (m.bollinger_bands) {
            renderBollingerChart(m.bollinger_bands, m.price_history_90d, m.bollinger_bands.dates);
        }
        if (m.rsi_history && m.rsi_history.length > 0) {
            renderRSIChart(m.rsi_history, m.date_labels_90d);
        }
        if (m.macd_data) {
            renderMACDChart(m.macd_data);
        }
        if (m.volume_history_90d && m.volume_history_90d.length > 0) {
            renderVolumeChart(m.volume_history_90d, m.date_labels_90d);
        }
        renderTechSummary(m);
    } else {
        richSection.classList.add('hidden');
    }

    // === Signal Grids ===
    renderSignalGrid('investorGrid', data.investor_signals);
    renderSignalGrid('analystGrid', data.analyst_signals);

    // === Breakdown ===
    document.getElementById('breakBulls').textContent = d.signals_summary.bulls || 'None';
    document.getElementById('breakNeutral').textContent = d.signals_summary.neutral || 'None';
    document.getElementById('breakBears').textContent = d.signals_summary.bears || 'None';

    document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderSignalGrid(containerId, signals) {
    const container = document.getElementById(containerId);
    container.innerHTML = signals.map(s => `
        <div class="signal-tile">
            <div class="signal-tile-header">
                <span class="signal-tile-name">${s.agent_name}</span>
                <span class="signal-badge ${s.signal}">${s.signal.replace('_', ' ')}</span>
            </div>
            <div class="signal-confidence">Confidence: ${s.confidence.replace('_', ' ')}</div>
            <div class="signal-reasoning">${s.reasoning}</div>
        </div>
    `).join('');
}

function renderPriceChart(prices, dateLabels) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    if (priceChart) priceChart.destroy();

    if (!prices || prices.length === 0) {
        priceChart = null;
        return;
    }

    const labels = dateLabels || prices.map((_, i) => 'D' + (i + 1));
    const minP = Math.min(...prices) * 0.995;
    const maxP = Math.max(...prices) * 1.005;

    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Price',
                data: prices,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99,102,241,0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => '$' + ctx.parsed.y.toFixed(2)
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8', maxTicksLimit: 8 }
                },
                y: {
                    min: minP,
                    max: maxP,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        callback: (v) => '$' + v.toFixed(0)
                    }
                }
            }
        }
    });
}

function renderSignalChart(signals) {
    const ctx = document.getElementById('signalChart').getContext('2d');
    if (signalChart) signalChart.destroy();

    const counts = { strong_buy: 0, buy: 0, hold: 0, sell: 0, strong_sell: 0 };
    signals.forEach(s => { counts[s.signal] = (counts[s.signal] || 0) + 1; });

    signalChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'],
            datasets: [{
                data: [counts.strong_buy, counts.buy, counts.hold, counts.sell, counts.strong_sell],
                backgroundColor: ['#16a34a', '#22c55e', '#eab308', '#ef4444', '#b91c1c'],
                borderColor: '#1a1f2e',
                borderWidth: 3,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', padding: 12, font: { size: 12 } }
                }
            }
        }
    });
}

function drawRiskGauge(score) {
    const canvas = document.getElementById('riskGauge');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h - 10;
    const radius = 75;
    const startAngle = Math.PI;
    const endAngle = 2 * Math.PI;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#2a3042';
    ctx.lineCap = 'round';
    ctx.stroke();

    const scoreAngle = startAngle + (score / 10) * Math.PI;
    const gradient = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
    gradient.addColorStop(0, '#22c55e');
    gradient.addColorStop(0.5, '#eab308');
    gradient.addColorStop(1, '#ef4444');

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, scoreAngle);
    ctx.lineWidth = 14;
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.stroke();

    const dotX = cx + radius * Math.cos(scoreAngle);
    const dotY = cy + radius * Math.sin(scoreAngle);
    ctx.beginPath();
    ctx.arc(dotX, dotY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
}

// =============================================
// === Rich Charts (Alpha Vantage) ===
// =============================================

function renderCandlestickChart(ohlcv) {
    const ctx = document.getElementById('candlestickChart').getContext('2d');
    if (candlestickChartObj) candlestickChartObj.destroy();

    const dates = ohlcv.map(d => d.date);
    const closes = ohlcv.map(d => d.close);
    const highs = ohlcv.map(d => d.high);
    const lows = ohlcv.map(d => d.low);
    const volumes = ohlcv.map(d => d.volume);

    // Color based on close vs open
    const barColors = ohlcv.map(d =>
        d.close >= d.open ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'
    );

    // Use floating bars for OHLC representation (high-low range)
    const floatingData = ohlcv.map(d => [d.low, d.high]);

    candlestickChartObj = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Price Range (Low-High)',
                    data: floatingData,
                    backgroundColor: barColors,
                    borderColor: barColors,
                    borderWidth: 1,
                    borderSkipped: false,
                    barPercentage: 0.6,
                    yAxisID: 'y',
                },
                {
                    label: 'Close',
                    data: closes,
                    type: 'line',
                    borderColor: '#6366f1',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.2,
                    fill: false,
                    yAxisID: 'y',
                },
                {
                    label: 'Volume',
                    data: volumes,
                    type: 'bar',
                    backgroundColor: 'rgba(99,102,241,0.15)',
                    borderWidth: 0,
                    yAxisID: 'y1',
                    barPercentage: 0.8,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            if (ctx.datasetIndex === 0) {
                                const bar = ohlcv[ctx.dataIndex];
                                return `O: $${bar.open?.toFixed(2)}  H: $${bar.high?.toFixed(2)}  L: $${bar.low?.toFixed(2)}  C: $${bar.close?.toFixed(2)}`;
                            }
                            if (ctx.datasetIndex === 2) {
                                const v = ctx.parsed.y;
                                return 'Vol: ' + (v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v.toLocaleString());
                            }
                            return '$' + ctx.parsed.y?.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8', maxTicksLimit: 10, maxRotation: 45 }
                },
                y: {
                    position: 'left',
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8', callback: v => '$' + v.toFixed(0) }
                },
                y1: {
                    position: 'right',
                    grid: { display: false },
                    ticks: {
                        color: '#94a3b8',
                        callback: v => v >= 1e6 ? (v/1e6).toFixed(0)+'M' : (v/1e3).toFixed(0)+'K'
                    },
                    beginAtZero: true,
                }
            }
        }
    });
}

function renderBollingerChart(bb, prices, dates) {
    const ctx = document.getElementById('bollingerChart').getContext('2d');
    if (bollingerChartObj) bollingerChartObj.destroy();

    // Align prices to bollinger dates (take last N matching)
    const n = bb.dates.length;
    const alignedPrices = prices.slice(-n);

    bollingerChartObj = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Upper Band',
                    data: bb.upper,
                    borderColor: 'rgba(239,68,68,0.5)',
                    borderWidth: 1,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: 'Middle Band',
                    data: bb.middle,
                    borderColor: 'rgba(234,179,8,0.6)',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: 'Lower Band',
                    data: bb.lower,
                    borderColor: 'rgba(34,197,94,0.5)',
                    borderWidth: 1,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    fill: '-2',
                    backgroundColor: 'rgba(99,102,241,0.06)',
                },
                {
                    label: 'Price',
                    data: alignedPrices,
                    borderColor: '#6366f1',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.2,
                    fill: false,
                },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.dataset.label + ': $' + (ctx.parsed.y?.toFixed(2) || 'N/A')
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8', maxTicksLimit: 8, maxRotation: 45 }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8', callback: v => '$' + v.toFixed(0) }
                }
            }
        }
    });
}

function renderRSIChart(rsiHistory, dates) {
    const ctx = document.getElementById('rsiChart').getContext('2d');
    if (rsiChartObj) rsiChartObj.destroy();

    const n = rsiHistory.length;
    const labels = dates && dates.length >= n ? dates.slice(-n) : rsiHistory.map((_, i) => 'D' + (i + 1));

    // Overbought/oversold reference lines
    const overbought = rsiHistory.map(() => 70);
    const oversold = rsiHistory.map(() => 30);

    rsiChartObj = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'RSI (14)',
                    data: rsiHistory,
                    borderColor: '#6366f1',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.3,
                    fill: false,
                    spanGaps: true,
                },
                {
                    label: 'Overbought (70)',
                    data: overbought,
                    borderColor: 'rgba(239,68,68,0.4)',
                    borderWidth: 1,
                    borderDash: [6, 3],
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: 'Oversold (30)',
                    data: oversold,
                    borderColor: 'rgba(34,197,94,0.4)',
                    borderWidth: 1,
                    borderDash: [6, 3],
                    pointRadius: 0,
                    fill: '-1',
                    backgroundColor: 'rgba(234,179,8,0.05)',
                },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8', maxTicksLimit: 8, maxRotation: 45 }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8', stepSize: 10 }
                }
            }
        }
    });
}

function renderMACDChart(macdData) {
    const ctx = document.getElementById('macdChart').getContext('2d');
    if (macdChartObj) macdChartObj.destroy();

    const histColors = macdData.histogram.map(v =>
        v >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'
    );

    macdChartObj = new Chart(ctx, {
        data: {
            labels: macdData.dates,
            datasets: [
                {
                    type: 'bar',
                    label: 'Histogram',
                    data: macdData.histogram,
                    backgroundColor: histColors,
                    borderWidth: 0,
                    order: 2,
                },
                {
                    type: 'line',
                    label: 'MACD',
                    data: macdData.macd,
                    borderColor: '#6366f1',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0,
                    tension: 0.2,
                    order: 1,
                },
                {
                    type: 'line',
                    label: 'Signal',
                    data: macdData.signal,
                    borderColor: '#ef4444',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0,
                    tension: 0.2,
                    order: 1,
                },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { size: 11 } } }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8', maxTicksLimit: 8, maxRotation: 45 }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

function renderVolumeChart(volumes, dates) {
    const ctx = document.getElementById('volumeChart').getContext('2d');
    if (volumeChartObj) volumeChartObj.destroy();

    const colors = volumes.map((v, i) =>
        i === 0 || v >= volumes[i - 1] ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'
    );

    volumeChartObj = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                label: 'Volume',
                data: volumes,
                backgroundColor: colors,
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8', maxTicksLimit: 8, maxRotation: 45 }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        callback: v => {
                            if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
                            if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
                            return v;
                        }
                    }
                }
            }
        }
    });
}

// === Technical Summary Panel ===

function renderTechSummary(m) {
    const s = (id, val, colorClass) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = val;
        el.className = colorClass || '';
    };

    s('techEMA20', m.ema_20 ? '$' + m.ema_20.toFixed(2) : 'N/A',
        m.ema_20 && m.current_price > m.ema_20 ? 'tech-bullish' : 'tech-bearish');
    s('techEMA50', m.ema_50 ? '$' + m.ema_50.toFixed(2) : 'N/A',
        m.ema_50 && m.current_price > m.ema_50 ? 'tech-bullish' : 'tech-bearish');
    s('techSMA20', m.sma_20 ? '$' + m.sma_20.toFixed(2) : 'N/A',
        m.sma_20 && m.current_price > m.sma_20 ? 'tech-bullish' : 'tech-bearish');
    s('techSMA50', m.sma_50 ? '$' + m.sma_50.toFixed(2) : 'N/A',
        m.sma_50 && m.current_price > m.sma_50 ? 'tech-bullish' : 'tech-bearish');
    s('techSMA200', m.sma_200 ? '$' + m.sma_200.toFixed(2) : 'N/A',
        m.sma_200 && m.current_price > m.sma_200 ? 'tech-bullish' : 'tech-bearish');

    const rsiClass = m.rsi_14 < 30 ? 'tech-bullish' : m.rsi_14 > 70 ? 'tech-bearish' : 'tech-neutral';
    s('techRSI', m.rsi_14 ? m.rsi_14.toFixed(1) : 'N/A', rsiClass);

    const adxClass = m.adx && m.adx > 25 ? 'tech-bullish' : 'tech-neutral';
    s('techADX', m.adx ? m.adx.toFixed(1) : 'N/A', adxClass);

    if (m.macd_data && m.macd_data.macd && m.macd_data.macd.length > 0) {
        const lastMACD = m.macd_data.macd[m.macd_data.macd.length - 1];
        const lastSignal = m.macd_data.signal[m.macd_data.signal.length - 1];
        s('techMACD', lastMACD != null ? lastMACD.toFixed(4) : 'N/A',
            lastMACD > lastSignal ? 'tech-bullish' : 'tech-bearish');
        s('techMACDSignal', lastSignal != null ? lastSignal.toFixed(4) : 'N/A');
    } else {
        s('techMACD', 'N/A');
        s('techMACDSignal', 'N/A');
    }

    if (m.bollinger_bands && m.bollinger_bands.upper && m.bollinger_bands.upper.length > 0) {
        const lastUpper = m.bollinger_bands.upper[m.bollinger_bands.upper.length - 1];
        const lastLower = m.bollinger_bands.lower[m.bollinger_bands.lower.length - 1];
        if (lastUpper && lastLower) {
            const bbRange = lastUpper - lastLower;
            const bbPos = bbRange > 0 ? ((m.current_price - lastLower) / bbRange * 100).toFixed(0) + '%' : 'N/A';
            const bbClass = m.current_price > lastUpper ? 'tech-bearish' :
                            m.current_price < lastLower ? 'tech-bullish' : 'tech-neutral';
            s('techBBPos', bbPos, bbClass);
        } else {
            s('techBBPos', 'N/A');
        }
    } else {
        s('techBBPos', 'N/A');
    }

    const trend = m.sma_50 && m.sma_200
        ? (m.sma_50 > m.sma_200 ? 'Uptrend' : 'Downtrend')
        : 'N/A';
    const trendClass = m.sma_50 && m.sma_200
        ? (m.sma_50 > m.sma_200 ? 'tech-bullish' : 'tech-bearish')
        : '';
    s('techTrend', trend, trendClass);

    s('techEPS', m.eps ? '$' + m.eps.toFixed(2) : 'N/A');
    s('techFwdPE', m.forward_pe ? m.forward_pe.toFixed(2) : 'N/A');
    s('techPEG', m.peg_ratio ? m.peg_ratio.toFixed(2) : 'N/A');
    s('techEVEBITDA', m.ev_to_ebitda ? m.ev_to_ebitda.toFixed(2) : 'N/A');
    s('techROE', m.return_on_equity ? (m.return_on_equity * 100).toFixed(1) + '%' : 'N/A');
}
