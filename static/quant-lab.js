/**
 * Quant Lab — Interactive Quantitative Finance Encyclopedia
 * Renders 200+ models with KaTeX equations, interactive calculators, Plotly charts.
 *
 * Dependencies (loaded via CDN in index.html):
 *   KaTeX     — LaTeX math rendering
 *   Plotly.js — Interactive charts
 *   mathjs    — Matrix math for JS computations
 */

import { MODELS, CATEGORIES, MODEL_BY_ID, MODELS_BY_CATEGORY } from './catalog/models.js';

// ── Pyodide Worker Bridge ──────────────────────────────────────────────────────

let pyodideWorker = null;
let pyodideReady = false;
let pyodideLoading = false;
let pendingCallbacks = new Map();
let callbackId = 0;

function ensurePyodide() {
  if (pyodideReady) return Promise.resolve();
  if (pyodideLoading) {
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (pyodideReady) { clearInterval(check); resolve(); }
      }, 200);
    });
  }
  pyodideLoading = true;
  return new Promise((resolve) => {
    pyodideWorker = new Worker('/static/pyodide-worker.js');
    pyodideWorker.postMessage({ type: 'init' });

    pyodideWorker.onmessage = (e) => {
      const { type, id, status, message, result, error, output } = e.data;
      if (type === 'ready') {
        pyodideReady = true;
        pyodideLoading = false;
        updatePyodideStatus('ready');
        resolve();
      } else if (type === 'status') {
        updatePyodideStatus(status, message);
      } else if (type === 'result' || type === 'error' || type === 'code_output') {
        const cb = pendingCallbacks.get(id);
        if (cb) { pendingCallbacks.delete(id); cb({ type, result, error, output }); }
      } else if (type === 'warning') {
        console.warn('Pyodide:', message);
      }
    };
    pyodideWorker.onerror = (e) => {
      pyodideLoading = false;
      updatePyodideStatus('error', e.message);
      resolve();
    };
  });
}

function callPyodide(type, payload) {
  return new Promise((resolve, reject) => {
    const id = ++callbackId;
    pendingCallbacks.set(id, ({ type: t, result, error, output }) => {
      if (t === 'error') reject(new Error(error));
      else resolve(result || output);
    });
    pyodideWorker.postMessage({ id, type, ...payload });
  });
}

function updatePyodideStatus(status, message) {
  const badge = document.getElementById('pyodideStatus');
  if (!badge) return;
  const labels = {
    loading: '⏳ Loading Python...',
    installing: `⏳ ${message || 'Installing...'}`,
    ready: '✓ Python Ready',
    error: '✗ Python Unavailable',
  };
  badge.textContent = labels[status] || status;
  badge.className = `pyodide-badge pyodide-${status}`;
}

// ── Module loading for JS models ───────────────────────────────────────────────

const loadedModules = {};

async function loadJSModule(moduleName) {
  if (loadedModules[moduleName]) return loadedModules[moduleName];
  const mod = await import(`/static/models/${moduleName}.js`);
  loadedModules[moduleName] = mod;
  // Also expose on window for Newton-Raphson etc.
  if (!window._quantModels) window._quantModels = {};
  window._quantModels[moduleName] = mod;
  return mod;
}

// ── State ──────────────────────────────────────────────────────────────────────

let currentModel = null;
let searchQuery = '';
let filterCategory = 'All';
let filterTier = 'All';
let filterDifficulty = 'All';
let filterCompute = 'All';

// ── Entry Point ────────────────────────────────────────────────────────────────

export function initQuantLab() {
  renderSidebar();
  renderModelList();
  setupSearch();
  setupFilters();

  // Auto-open first high-priority model
  const first = MODELS.find(m => m.tier === 1 && m.priority === 'High');
  if (first) openModel(first.id);
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

function renderSidebar() {
  const sidebar = document.getElementById('qlSidebar');
  if (!sidebar) return;
  sidebar.innerHTML = `
    <div class="ql-sidebar-header">
      <span id="pyodideStatus" class="pyodide-badge pyodide-loading">⏳ Python Ready (click a model)</span>
    </div>
    ${CATEGORIES.map(cat => {
      const count = (MODELS_BY_CATEGORY[cat] || []).length;
      if (!count) return '';
      return `<div class="ql-cat-item" data-cat="${cat}" onclick="window._ql.filterByCat('${cat}')">
        <span class="ql-cat-name">${cat}</span>
        <span class="ql-cat-count">${count}</span>
      </div>`;
    }).join('')}
    <div class="ql-cat-item${filterCategory === 'All' ? ' active' : ''}" data-cat="All" onclick="window._ql.filterByCat('All')">
      <span class="ql-cat-name">All Models</span>
      <span class="ql-cat-count">${MODELS.length}</span>
    </div>
  `;
}

// ── Model List ────────────────────────────────────────────────────────────────

function renderModelList() {
  const list = document.getElementById('qlModelList');
  if (!list) return;
  const filtered = getFilteredModels();
  if (!filtered.length) {
    list.innerHTML = `<div class="ql-empty">No models match your filters.</div>`;
    return;
  }
  list.innerHTML = filtered.map(m => `
    <div class="ql-model-card ${currentModel?.id === m.id ? 'active' : ''}"
         data-id="${m.id}" onclick="window._ql.openModel('${m.id}')">
      <div class="ql-model-name">${m.name}</div>
      <div class="ql-model-meta">
        <span class="badge badge-${m.difficulty.toLowerCase()}">${m.difficulty}</span>
        <span class="badge badge-tier">T${m.tier}</span>
        <span class="ql-compute-icon">${m.compute === 'js' ? '⚡' : '🐍'}</span>
      </div>
      <div class="ql-model-asset">${m.assetClass}</div>
    </div>
  `).join('');
}

function getFilteredModels() {
  return MODELS.filter(m => {
    if (filterCategory !== 'All' && m.category !== filterCategory) return false;
    if (filterTier !== 'All' && m.tier !== parseInt(filterTier)) return false;
    if (filterDifficulty !== 'All' && m.difficulty !== filterDifficulty) return false;
    if (filterCompute !== 'All' && m.compute !== filterCompute) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) ||
        m.useCase.toLowerCase().includes(q) || m.assetClass.toLowerCase().includes(q);
    }
    return true;
  });
}

// ── Search & Filters ──────────────────────────────────────────────────────────

function setupSearch() {
  const input = document.getElementById('qlSearch');
  if (!input) return;
  input.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderModelList();
  });
}

function setupFilters() {
  const catFilter = document.getElementById('qlFilterCat');
  const tierFilter = document.getElementById('qlFilterTier');
  const diffFilter = document.getElementById('qlFilterDiff');
  const computeFilter = document.getElementById('qlFilterCompute');

  if (catFilter) {
    catFilter.innerHTML = `<option value="All">All Categories</option>` +
      CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
    catFilter.addEventListener('change', e => { filterCategory = e.target.value; renderModelList(); });
  }
  if (tierFilter) tierFilter.addEventListener('change', e => { filterTier = e.target.value; renderModelList(); });
  if (diffFilter) diffFilter.addEventListener('change', e => { filterDifficulty = e.target.value; renderModelList(); });
  if (computeFilter) computeFilter.addEventListener('change', e => { filterCompute = e.target.value; renderModelList(); });
}

// ── Model Detail Panel ────────────────────────────────────────────────────────

export async function openModel(modelId) {
  const model = MODEL_BY_ID[modelId];
  if (!model) return;
  currentModel = model;

  // Highlight in list
  document.querySelectorAll('.ql-model-card').forEach(el => el.classList.remove('active'));
  const card = document.querySelector(`.ql-model-card[data-id="${modelId}"]`);
  if (card) card.classList.add('active');

  const panel = document.getElementById('qlDetailPanel');
  if (!panel) return;

  panel.innerHTML = buildDetailHTML(model);

  // Render KaTeX equation
  setTimeout(() => {
    const eqEl = document.getElementById('qlEquation');
    if (eqEl && window.katex) {
      try {
        window.katex.render(model.latex, eqEl, { displayMode: true, throwOnError: false });
      } catch (e) {
        eqEl.textContent = model.latex;
      }
    }
  }, 0);

  // Attach param input listeners
  attachParamListeners(model);
}

function buildDetailHTML(m) {
  const tierColors = { 1: 'tier1', 2: 'tier2', 3: 'tier3' };
  return `
    <div class="ql-detail-header">
      <div>
        <h2 class="ql-detail-title">${m.name}</h2>
        <div class="ql-detail-badges">
          <span class="badge badge-cat">${m.category}</span>
          <span class="badge badge-${m.difficulty.toLowerCase()}">${m.difficulty}</span>
          <span class="badge badge-${m.priority.toLowerCase()}">${m.priority} Priority</span>
          <span class="badge badge-${tierColors[m.tier] || 'tier1'}">Tier ${m.tier}</span>
          <span class="badge badge-asset">${m.assetClass}</span>
          <span class="badge badge-compute">${m.compute === 'js' ? '⚡ JavaScript' : '🐍 Python (Pyodide)'}</span>
        </div>
      </div>
    </div>

    <div class="ql-equation-box">
      <div id="qlEquation" class="ql-equation"></div>
    </div>

    <p class="ql-description">${m.description}</p>
    <p class="ql-usecase"><strong>Use Case:</strong> ${m.useCase}</p>

    ${buildCalculatorHTML(m)}

    ${m.pyCode ? buildCodeHTML(m) : ''}

    <div id="qlChartContainer" class="ql-chart-container" style="display:none">
      <div id="qlPlot" style="width:100%;height:300px;"></div>
    </div>
  `;
}

function buildCalculatorHTML(m) {
  if (!m.params || m.params.length === 0) {
    if (m.compute === 'pyodide') {
      return `<div class="ql-calc-card">
        <div class="ql-calc-header">
          <span>Interactive Computation</span>
          <button class="btn-run-py" onclick="window._ql.runPyCode('${m.id}')">🐍 Run in Python</button>
        </div>
        <div id="qlResult" class="ql-result-area">Click "Run in Python" to execute with Pyodide.</div>
      </div>`;
    }
    return '';
  }

  const inputs = m.params.map(p => {
    if (p.type === 'series') {
      return `<div class="ql-param">
        <label>${p.label}</label>
        <input type="text" class="ql-param-series" data-id="${p.id}" data-scale="${p.scale || 1}"
               value="${p.default}" placeholder="comma-separated values" oninput="window._ql.onParamChange('${m.id}')">
      </div>`;
    }
    if (p.type === 'select') {
      return `<div class="ql-param">
        <label>${p.label}</label>
        <select class="ql-param-select" data-id="${p.id}" onchange="window._ql.onParamChange('${m.id}')">
          ${(p.options || []).map(o => `<option value="${o}" ${o === p.default ? 'selected' : ''}>${o}</option>`).join('')}
        </select>
      </div>`;
    }
    // Number slider + input
    const step = p.max !== undefined ? (p.max - (p.min || 0)) / 100 : 0.1;
    return `<div class="ql-param">
      <label>${p.label}</label>
      <div class="ql-param-row">
        <input type="range" class="ql-param-slider" data-id="${p.id}"
               min="${p.min !== undefined ? p.min : -1000}"
               max="${p.max !== undefined ? p.max : 1000}"
               step="${step}" value="${p.default}"
               oninput="window._ql.onSlider('${m.id}','${p.id}',this.value)">
        <input type="number" class="ql-param-num" data-id="${p.id}" value="${p.default}"
               step="${step}" oninput="window._ql.onParamChange('${m.id}')">
      </div>
    </div>`;
  }).join('');

  const runBtn = m.compute === 'pyodide'
    ? `<button class="btn-run-py" onclick="window._ql.runPyCode('${m.id}')">🐍 Run in Python</button>`
    : '';

  return `<div class="ql-calc-card">
    <div class="ql-calc-header">
      <span>Calculator</span>
      ${runBtn}
    </div>
    <div class="ql-params-grid">${inputs}</div>
    <div id="qlResult" class="ql-result-area">
      <div class="ql-result-placeholder">Adjust parameters above to see results</div>
    </div>
  </div>`;
}

function buildCodeHTML(m) {
  return `<div class="ql-code-card">
    <div class="ql-code-header">
      Python Code
      <a href="https://github.com/wilsonfreitas/awesome-quant" target="_blank" class="ql-awesome-link">
        awesome-quant ↗
      </a>
    </div>
    <pre class="ql-code"><code class="language-python">${escapeHtml(m.pyCode)}</code></pre>
  </div>`;
}

// ── Parameter Handling ────────────────────────────────────────────────────────

function attachParamListeners(model) {
  if (!model.params || !model.params.length) return;
  // Initial computation
  setTimeout(() => computeAndRender(model), 100);
}

export function onSlider(modelId, paramId, value) {
  // Sync slider → number input
  const numInput = document.querySelector(`.ql-param-num[data-id="${paramId}"]`);
  if (numInput) numInput.value = parseFloat(value).toFixed(4).replace(/\.?0+$/, '');
  onParamChange(modelId);
}

export function onParamChange(modelId) {
  const model = MODEL_BY_ID[modelId];
  if (!model) return;
  // Sync number → slider
  document.querySelectorAll('.ql-param-num').forEach(input => {
    const slider = document.querySelector(`.ql-param-slider[data-id="${input.dataset.id}"]`);
    if (slider) slider.value = input.value;
  });
  computeAndRender(model);
}

function collectParams(model) {
  const params = {};
  for (const p of model.params || []) {
    if (p.type === 'series') {
      const input = document.querySelector(`.ql-param-series[data-id="${p.id}"]`);
      if (!input) continue;
      const scale = parseFloat(input.dataset.scale) || 1;
      params[p.id] = input.value.split(',').map(s => parseFloat(s.trim()) * scale).filter(n => !isNaN(n));
    } else if (p.type === 'select') {
      const sel = document.querySelector(`.ql-param-select[data-id="${p.id}"]`);
      params[p.id] = sel ? sel.value : p.default;
    } else {
      const input = document.querySelector(`.ql-param-num[data-id="${p.id}"]`) ||
        document.querySelector(`.ql-param-slider[data-id="${p.id}"]`);
      if (!input) continue;
      const val = parseFloat(input.value);
      params[p.id] = (p.scale ? val * p.scale : val);
    }
  }
  return params;
}

async function computeAndRender(model) {
  const resultEl = document.getElementById('qlResult');
  if (!resultEl) return;

  const params = collectParams(model);

  try {
    let result;
    if (model.computeJs) {
      // Inline JS computation
      result = await model.computeJs(params);
    } else if (model.compute === 'js' && model.jsModule && model.jsFunction) {
      const mod = await loadJSModule(model.jsModule);
      const fn = mod[model.jsFunction];
      if (!fn) throw new Error(`Function ${model.jsFunction} not found in ${model.jsModule}`);
      // Call function with spread params or positional args
      result = fn(...Object.values(params));
      if (typeof result !== 'object' || result === null) {
        result = { result };
      }
    } else if (model.compute === 'pyodide') {
      resultEl.innerHTML = `<div class="ql-result-info">🐍 Click "Run in Python" to compute with Pyodide</div>`;
      return;
    } else {
      return;
    }

    renderResult(result, model, resultEl, params);
    renderChart(model, result, params);
  } catch (e) {
    resultEl.innerHTML = `<div class="ql-result-error">Error: ${escapeHtml(e.message)}</div>`;
  }
}

function renderResult(result, model, el, params) {
  if (result === null || result === undefined) { el.innerHTML = '—'; return; }

  const outputs = model.outputs || [];
  if (!outputs.length && typeof result === 'object') {
    // Render all keys
    const rows = Object.entries(result).map(([k, v]) =>
      `<tr><td>${k}</td><td>${formatValue(v, 'num4')}</td></tr>`
    ).join('');
    el.innerHTML = `<table class="ql-result-table">${rows}</table>`;
    return;
  }

  const rows = outputs.map(out => {
    const val = typeof result === 'object' ? result[out.id] : result;
    return `<tr>
      <td class="ql-result-label">${out.label}</td>
      <td class="ql-result-value">${formatValue(val, out.format)}</td>
    </tr>`;
  }).join('');
  el.innerHTML = `<table class="ql-result-table">${rows}</table>`;
}

function formatValue(val, fmt) {
  if (val === null || val === undefined || Number.isNaN(val)) return '—';
  if (Array.isArray(val)) return `[${val.slice(0, 5).map(v => formatValue(v, fmt)).join(', ')}${val.length > 5 ? '...' : ''}]`;
  const n = parseFloat(val);
  switch (fmt) {
    case 'pct': return `${(n * 100).toFixed(2)}%`;
    case 'dollar': return `$${n.toFixed(2)}`;
    case 'num0': return n.toFixed(0);
    case 'num1': return n.toFixed(1);
    case 'num2': return n.toFixed(2);
    case 'num3': return n.toFixed(3);
    case 'num4': return n.toFixed(4);
    case 'num6': return n.toFixed(6);
    default: return String(val);
  }
}

// ── Chart Rendering ───────────────────────────────────────────────────────────

function renderChart(model, result, params) {
  if (!model.charts || !model.charts.length || !window.Plotly) return;
  const container = document.getElementById('qlChartContainer');
  const plotDiv = document.getElementById('qlPlot');
  if (!container || !plotDiv) return;
  container.style.display = 'block';

  const chart = model.charts[0];

  if (chart === 'payoff-diagram') {
    const K = params.K || 100;
    const premium = (result?.call || result?.put || 5);
    const type = params.type || 'call';
    const spots = [], payoffs = [], pnls = [];
    for (let s = K * 0.6; s <= K * 1.4; s += K * 0.01) {
      spots.push(s);
      const intrinsic = type === 'call' ? Math.max(s - K, 0) : Math.max(K - s, 0);
      payoffs.push(intrinsic);
      pnls.push(intrinsic - premium);
    }
    plotLines(plotDiv, spots,
      [{ y: payoffs, name: 'Payoff at expiry', color: '#3b82f6' },
      { y: pnls, name: 'P&L (incl. premium)', color: '#10b981' }],
      'Stock Price at Expiry', 'Value ($)', 'Option Payoff Diagram');
  }

  if (chart === 'efficient-frontier' && result?.efficient_frontier) {
    const ef = result.efficient_frontier;
    const vols = ef.map(p => p.vol * 100);
    const rets = ef.map(p => p.return * 100);
    window.Plotly.newPlot(plotDiv, [{
      x: vols, y: rets, mode: 'lines+markers', name: 'Efficient Frontier',
      line: { color: '#3b82f6' },
      hovertemplate: 'Vol: %{x:.1f}%<br>Ret: %{y:.1f}%<extra></extra>',
    }], {
      xaxis: { title: 'Portfolio Volatility (%)' },
      yaxis: { title: 'Expected Return (%)' },
      title: 'Efficient Frontier',
      paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
      font: { color: getComputedStyle(document.documentElement).getPropertyValue('--text') || '#fff' },
    }, { responsive: true, displayModeBar: false });
  }

  if (chart === 'yield-curve') {
    const mats = params.maturities;
    const yields = Array.isArray(result) ? result : Object.values(result);
    plotLines(plotDiv, mats, [{ y: yields.map(y => y * 100), name: 'Yield Curve', color: '#f59e0b' }],
      'Maturity (years)', 'Yield (%)', 'Nelson-Siegel Yield Curve');
  }

  if (chart === 'gbm-paths') {
    // Simulate a few GBM paths for visualization
    const { S0, mu, sigma, T, nSteps } = params;
    const steps = Math.min(nSteps || 252, 252);
    const dt = T / steps;
    const nPaths = 5;
    const traces = [];
    for (let p = 0; p < nPaths; p++) {
      const path = [S0];
      for (let i = 0; i < steps; i++) {
        const z = boxMuller();
        path.push(path[path.length - 1] * Math.exp((mu - 0.5 * sigma ** 2) * dt + sigma * Math.sqrt(dt) * z));
      }
      traces.push({ y: path, mode: 'lines', name: `Path ${p + 1}`, opacity: 0.7 });
    }
    window.Plotly.newPlot(plotDiv, traces, {
      xaxis: { title: 'Time Steps' }, yaxis: { title: 'Price ($)' },
      title: 'GBM Simulated Paths', paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
      showlegend: false,
    }, { responsive: true, displayModeBar: false });
  }

  if (chart === 'price-vs-spot' && result) {
    // BSM price across spot range
    const K = params.K || 100, r = params.r || 0.05, T = params.T || 1, sigma = params.sigma || 0.2;
    const spots = [], calls = [], puts = [], deltas = [];
    for (let s = K * 0.5; s <= K * 1.5; s += K * 0.02) {
      spots.push(s);
    }
    loadJSModule('black-scholes').then(bsm => {
      for (const s of spots) {
        calls.push(bsm.bsmPrice('call', s, K, r, T, sigma));
        puts.push(bsm.bsmPrice('put', s, K, r, T, sigma));
        deltas.push(bsm.delta('call', s, K, r, T, sigma));
      }
      plotLines(plotDiv, spots,
        [{ y: calls, name: 'Call Price', color: '#10b981' },
        { y: puts, name: 'Put Price', color: '#ef4444' },
        { y: deltas.map(d => d * 20 + K * 0.5), name: 'Delta (scaled)', color: '#f59e0b' }],
        'Spot Price', 'Value', 'BSM Price vs Spot');
    });
  }
}

function plotLines(div, x, series, xLabel, yLabel, title) {
  if (!window.Plotly) return;
  const traces = series.map(s => ({
    x, y: s.y, mode: 'lines', name: s.name,
    line: { color: s.color },
    hovertemplate: `${s.name}: %{y:.4f}<extra></extra>`,
  }));
  window.Plotly.newPlot(div, traces, {
    xaxis: { title: xLabel }, yaxis: { title: yLabel }, title,
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { color: getComputedStyle(document.documentElement).getPropertyValue('--text') || '#ccc' },
    margin: { t: 40, l: 50, r: 20, b: 40 },
  }, { responsive: true, displayModeBar: false });
}

function boxMuller() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ── Pyodide Run Button ────────────────────────────────────────────────────────

export async function runPyCode(modelId) {
  const model = MODEL_BY_ID[modelId];
  if (!model) return;
  const resultEl = document.getElementById('qlResult');
  if (!resultEl) return;

  resultEl.innerHTML = `<div class="ql-result-info">⏳ Loading Python runtime...</div>`;
  await ensurePyodide();

  const params = collectParams(model);

  // Try model-specific computation first
  if (model.compute === 'pyodide' && model.params && model.params.length > 0) {
    resultEl.innerHTML = `<div class="ql-result-info">⏳ Running computation...</div>`;
    try {
      const result = await callPyodide('compute_model', { model_id: modelId, params });
      if (result && typeof result === 'object') {
        const rows = Object.entries(result)
          .filter(([, v]) => typeof v !== 'object')
          .map(([k, v]) => `<tr><td>${k.replace(/_/g, ' ')}</td><td>${formatValue(v, 'num4')}</td></tr>`)
          .join('');
        resultEl.innerHTML = `<table class="ql-result-table">${rows}</table>`;
        renderChart(model, result, params);
      }
    } catch (e) {
      resultEl.innerHTML = `<div class="ql-result-error">Error: ${escapeHtml(e.message)}</div>`;
    }
    return;
  }

  // Fall back to running example code
  if (model.pyCode) {
    resultEl.innerHTML = `<div class="ql-result-info">⏳ Running example code...</div>`;
    try {
      const output = await callPyodide('run_code', { code: model.pyCode });
      resultEl.innerHTML = `<pre class="ql-py-output">${escapeHtml(String(output))}</pre>`;
    } catch (e) {
      resultEl.innerHTML = `<div class="ql-result-error">Error: ${escapeHtml(e.message)}</div>`;
    }
  }
}

// ── Category Filter ───────────────────────────────────────────────────────────

export function filterByCat(cat) {
  filterCategory = cat;
  document.querySelectorAll('.ql-cat-item').forEach(el => {
    el.classList.toggle('active', el.dataset.cat === cat);
  });
  const catFilter = document.getElementById('qlFilterCat');
  if (catFilter) catFilter.value = cat;
  renderModelList();
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Expose public API for onclick handlers
window._ql = {
  openModel,
  filterByCat,
  onParamChange,
  onSlider,
  runPyCode,
};
