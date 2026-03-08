// === AI Hedge Fund Dashboard — Multi-Ticker ===

let priceChart = null;
let signalChart = null;
let comparisonChart = null;
let riskCompChart = null;

// All results stored for tab switching
let allResults = [];
let activeTickerIdx = 0;

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
    const portfolio = parseFloat(document.getElementById('portfolioInput').value) || 1000000;
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
    document.getElementById('loadingText').textContent =
        isMulti
            ? `Analyzing ${tickers.length} tickers (${tickers.join(', ')})...`
            : `18 agents analyzing ${tickers[0]}...`;
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
        body: JSON.stringify({ ticker, portfolio_value: portfolio }),
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
        body: JSON.stringify({ tickers, portfolio_value: portfolio }),
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

        // Render portfolio summary
        renderPortfolioSummary(allResults, errors);

        // Render ticker tabs
        renderTickerTabs(allResults);

        // Render first ticker's detail
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

    // Summary table
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

    // Errors
    const errEl = document.getElementById('summaryErrors');
    errEl.innerHTML = errors.map(e =>
        `<div class="error-item">Failed: ${e.ticker} — ${e.error}</div>`
    ).join('');

    // Comparison charts
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

    // Update tab active state
    document.querySelectorAll('.ticker-tab').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
    });

    // Update summary table active row
    document.querySelectorAll('#summaryBody tr').forEach((el, i) => {
        el.classList.toggle('active-row', i === idx);
    });

    // Re-render dashboard for this ticker
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

    // === Price Chart ===
    renderPriceChart(m.price_history_30d);

    // === Signal Distribution Chart ===
    const allSignals = [...data.investor_signals, ...data.analyst_signals];
    renderSignalChart(allSignals);

    // === Signal Grids ===
    renderSignalGrid('investorGrid', data.investor_signals);
    renderSignalGrid('analystGrid', data.analyst_signals);

    // === Breakdown ===
    document.getElementById('breakBulls').textContent = d.signals_summary.bulls || 'None';
    document.getElementById('breakNeutral').textContent = d.signals_summary.neutral || 'None';
    document.getElementById('breakBears').textContent = d.signals_summary.bears || 'None';

    // Scroll to dashboard (not top, so summary stays visible)
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

function renderPriceChart(prices) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    if (priceChart) priceChart.destroy();

    if (!prices || prices.length === 0) {
        priceChart = null;
        return;
    }

    const labels = prices.map((_, i) => 'D' + (i + 1));
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

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#2a3042';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Score arc
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

    // Needle dot
    const dotX = cx + radius * Math.cos(scoreAngle);
    const dotY = cy + radius * Math.sin(scoreAngle);
    ctx.beginPath();
    ctx.arc(dotX, dotY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
}
