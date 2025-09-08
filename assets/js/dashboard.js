/**
 * Deep Aries - Stock Dashboard JavaScript
 * GitHub Pages optimized static dashboard with advanced features
 */

class StockDashboard {
  constructor() {
    this.data = {
      market: null,
      marketPast: null,
      future: null,
      result: null,
      test: null
    };
    this.charts = {};
    this.currentTab = 'dashboard';
    this.userPreferences = this.loadUserPreferences();
    this.init();
  }

  async init() {
    try {
      await this.loadAllData();
      this.advancedFeatures = new AdvancedFeatures(this);
      this.setupEventListeners();
      this.setupTabNavigation();
      this.renderInitialCharts();
      this.loadNewsFeed();
    } catch (error) {
      this.showError('Error loading data: ' + error.message);
    }
  }

  async loadAllData() {
    const dataFiles = [
      'data/market.csv',
      'data/market_past.csv', 
      'data/future.csv',
      'data/result.csv',
      'data/test.csv'
    ];

    const [market, marketPast, future, result, test] = await Promise.all(
      dataFiles.map(file => this.loadCSV(file))
    );

    this.data = { market, marketPast, future, result, test };
  }

  async loadCSV(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    const text = await res.text();
    
    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (result) => resolve(result.data),
      });
    });
  }

  setupEventListeners() {
    // Dashboard tab events
    document.getElementById('update_market_btn').addEventListener('click', () => {
      const selected = Array.from(document.getElementById('market_ticker_select').selectedOptions)
        .map(o => o.value).slice(0, 15);
      this.renderTimeSeries('timeseries', this.groupMarket(this.data.market), selected);
    });

    document.getElementById('update_past_btn').addEventListener('click', () => {
      const selected = Array.from(document.getElementById('past_ticker_select').selectedOptions)
        .map(o => o.value).slice(0, 15);
      this.renderTimeSeries('past_timeseries', this.groupMarket(this.data.marketPast), selected);
    });

    document.getElementById('update_result_btn').addEventListener('click', () => {
      this.updateResultSection();
    });

    document.getElementById('update_index_btn').addEventListener('click', () => {
      const selected = document.getElementById('index_market_select').value;
      this.renderIndexSeries('index_series', this.data.test, selected);
    });

    // Export buttons
    document.getElementById('export_market_btn').addEventListener('click', () => {
      this.exportData(this.data.market, 'market_data.csv');
    });

    document.getElementById('export_past_btn').addEventListener('click', () => {
      this.exportData(this.data.marketPast, 'past_market_data.csv');
    });

    document.getElementById('export_heatmap_btn').addEventListener('click', () => {
      this.exportData(this.data.future, 'future_predictions.csv');
    });

    document.getElementById('export_result_btn').addEventListener('click', () => {
      this.exportData(this.data.result, 'portfolio_results.csv');
    });

    document.getElementById('export_index_btn').addEventListener('click', () => {
      this.exportData(this.data.test, 'index_data.csv');
    });

    // Fullscreen button
    document.getElementById('fullscreen_heatmap_btn').addEventListener('click', () => {
      this.openFullscreen('heatmap');
    });

    // Analysis tab events
    document.getElementById('update_tech_btn').addEventListener('click', () => {
      this.updateTechnicalAnalysis();
    });

    document.getElementById('update_candle_btn').addEventListener('click', () => {
      this.updateCandlestickChart();
    });

    document.getElementById('update_volume_btn').addEventListener('click', () => {
      this.updateVolumeAnalysis();
    });

    document.getElementById('update_correlation_btn').addEventListener('click', () => {
      this.updateCorrelationMatrix();
    });

    // Portfolio tab events
    document.getElementById('optimize_portfolio_btn').addEventListener('click', () => {
      this.optimizePortfolio();
    });

    document.getElementById('rebalance_btn').addEventListener('click', () => {
      this.rebalancePortfolio();
    });

    // Risk tab events
    document.getElementById('calculate_var_btn').addEventListener('click', () => {
      this.calculateVaR();
    });

    document.getElementById('run_stress_test_btn').addEventListener('click', () => {
      this.runStressTest();
    });

    // News tab events
    document.getElementById('update_news_btn').addEventListener('click', () => {
      this.updateNewsSentiment();
    });

    document.getElementById('update_social_btn').addEventListener('click', () => {
      this.updateSocialSentiment();
    });
  }

  renderInitialCharts() {
    // Market data
    const marketData = this.groupMarket(this.data.market);
    this.populateSelect('market_ticker_select', marketData.tickers);
    this.renderTimeSeries('timeseries', marketData, []);

    // Past market data
    const pastData = this.groupMarket(this.data.marketPast);
    this.populateSelect('past_ticker_select', pastData.tickers);
    this.renderTimeSeries('past_timeseries', pastData, []);

    // Future heatmap
    const futureData = this.buildFutureMatrix(this.data.future);
    this.renderHeatmap('heatmap', futureData);

    // Result data
    this.setupResultSection();

    // Test data
    const indexMarkets = this.unique(this.data.test.map(r => r.market).filter(Boolean)).sort();
    this.populateSelect('index_market_select', indexMarkets);
    this.renderIndexSeries('index_series', this.data.test, indexMarkets[0]);
  }

  groupMarket(rows) {
    rows = rows.filter(r => r.date && r.ticker && r.close != null);
    rows.sort((a, b) => new Date(a.date) - new Date(b.date));

    const byTicker = {};
    const tickers = new Set();

    for (const r of rows) {
      tickers.add(r.ticker);
      if (!byTicker[r.ticker]) byTicker[r.ticker] = { date: [], close: [] };
      byTicker[r.ticker].date.push(r.date);
      byTicker[r.ticker].close.push(r.close);
    }
    return { byTicker, tickers: Array.from(tickers).sort() };
  }

  renderTimeSeries(elemId, byTicker, chosenTickers) {
    const traces = [];
    const selected = chosenTickers && chosenTickers.length ? chosenTickers : Object.keys(byTicker).slice(0, 5);
    
    for (const t of selected) {
      const s = byTicker[t];
      if (!s) continue;
      traces.push({
        x: s.date,
        y: s.close,
        type: "scatter",
        mode: "lines",
        name: t,
        line: { width: 2 }
      });
    }

    const layout = {
      margin: { t: 20, r: 10, b: 40, l: 45 },
      xaxis: { title: "Date" },
      yaxis: { title: "Close Price" },
      hovermode: 'x unified',
      showlegend: true
    };

    Plotly.newPlot(elemId, traces, layout, { responsive: true });
  }

  buildFutureMatrix(rows) {
    if (!rows || !rows.length) return { tickers: [], dates: [], values: [] };
    const cols = Object.keys(rows[0]).filter(c => c !== "Ticker");
    const tickers = rows.map(r => r["Ticker"]);
    const values = rows.map(r => cols.map(c => r[c]));
    return { tickers, dates: cols, values };
  }

  renderHeatmap(elemId, futureData) {
    const trace = {
      type: "heatmap",
      z: futureData.values,
      x: futureData.dates,
      y: futureData.tickers,
      colorbar: { title: "Predicted Value" },
      colorscale: 'RdYlBu'
    };

    const layout = {
      margin: { t: 20, r: 10, b: 40, l: 90 },
      xaxis: { automargin: true },
      yaxis: { automargin: true },
      title: "Future Predictions Heatmap"
    };

    Plotly.newPlot(elemId, [trace], layout, { responsive: true });
  }

  setupResultSection() {
    const models = this.unique(this.data.result.map(r => r.model).filter(Boolean)).sort();
    const dates = this.unique(this.data.result.map(r => r.date).filter(Boolean))
      .sort((a, b) => new Date(a) - new Date(b));

    this.populateSelect('model_select', models);
    this.populateSelect('date_select', dates);
    
    this.updateResultSection();
  }

  updateResultSection() {
    const modelSel = document.getElementById('model_select');
    const dateSel = document.getElementById('date_select');
    const models = this.unique(this.data.result.map(r => r.model).filter(Boolean)).sort();
    const dates = this.unique(this.data.result.map(r => r.date).filter(Boolean))
      .sort((a, b) => new Date(a) - new Date(b));

    const mdl = modelSel.value || models[0];
    const dt = dateSel.value || dates[dates.length - 1];

    const rows = this.data.result.filter(r => r.model === mdl && r.date === dt);

    // Update metadata
    const info = rows[0] || {};
    const metaEl = document.getElementById('portfolio_meta');
    metaEl.textContent = `Model: ${mdl} • Date: ${dt} • Market: ${info.market ?? "—"} • Ticker: ${info.ticker ?? "—"} • Pred Len: ${info.pred_len ?? "—"} • Final PV: ${info["Final Portfolio Value"] ?? "—"}`;

    // Top-5 portfolio bars
    let t5 = [], w5 = [];
    if (rows.length) {
      const topList = (rows[0].top_5_portfolio || "").split(",").map(s => s.trim()).filter(Boolean);
      const pr = this.sanitizePortfolioString(rows[0].portfolio_ratio);
      
      if (pr && Array.isArray(pr.top_5) && pr.top_5.length === topList.length) {
        t5 = topList;
        w5 = pr.top_5;
      } else {
        t5 = topList;
        w5 = topList.map(() => 1 / topList.length);
      }
    }
    this.renderPortfolioBars("portfolio_bars", t5, w5, "Weight");

    // Portfolio value chart
    const sameMarket = this.data.result.filter(r => r.market === (rows[0]?.market ?? rows[0]?.market));
    this.renderPortfolioValue("portfolio_value", sameMarket.length ? sameMarket : this.data.result);
  }

  renderPortfolioBars(elemId, tickers, weights, title = "Weights") {
    const trace = {
      type: "bar",
      x: tickers,
      y: weights,
      hovertemplate: "%{x}<br>%{y:.4f}<extra></extra>",
      marker: { color: '#2563eb' }
    };

    const layout = {
      margin: { t: 30, r: 10, b: 80, l: 50 },
      xaxis: { tickangle: -30 },
      yaxis: { title: title },
      title: `Top-5 ${title}`
    };

    Plotly.newPlot(elemId, [trace], layout, { responsive: true });
  }

  renderPortfolioValue(elemId, rows) {
    rows = rows.filter(r => r.date && r["Final Portfolio Value"] != null && r.model);
    rows.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const byModel = {};
    for (const r of rows) {
      if (!byModel[r.model]) byModel[r.model] = { x: [], y: [] };
      byModel[r.model].x.push(r.date);
      byModel[r.model].y.push(r["Final Portfolio Value"]);
    }

    const traces = Object.entries(byModel).map(([m, s]) => ({
      type: "scatter",
      mode: "lines",
      name: m,
      x: s.x,
      y: s.y,
      line: { width: 2 }
    }));

    const layout = {
      margin: { t: 20, r: 10, b: 40, l: 50 },
      xaxis: { title: "Date" },
      yaxis: { title: "Final Portfolio Value" },
      title: "Portfolio Performance by Model"
    };

    Plotly.newPlot(elemId, traces, layout, { responsive: true });
  }

  renderIndexSeries(elemId, rows, marketName) {
    let data = rows;
    if (marketName) data = rows.filter(r => r.market === marketName);
    data = data.filter(r => r.date && r.close != null);
    data.sort((a, b) => new Date(a.date) - new Date(b.date));

    const trace = {
      type: "scatter",
      mode: "lines",
      name: marketName || "index",
      x: data.map(r => r.date),
      y: data.map(r => r.close),
      line: { width: 2, color: '#2563eb' }
    };

    const layout = {
      margin: { t: 20, r: 10, b: 40, l: 50 },
      xaxis: { title: "Date" },
      yaxis: { title: "Close Price" },
      title: `${marketName || 'Index'} Time Series`
    };

    Plotly.newPlot(elemId, [trace], layout, { responsive: true });
  }

  populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    select.innerHTML = '';
    options.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option;
      select.appendChild(opt);
    });
  }

  sanitizePortfolioString(s) {
    if (typeof s !== "string") return null;
    try {
      const json = JSON.parse(s.replace(/'/g, '"'));
      return json;
    } catch (e) {
      return null;
    }
  }

  unique(arr) {
    return Array.from(new Set(arr));
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
  }

  // Tab Navigation
  setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        
        // Remove active class from all tabs and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        button.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
        
        this.currentTab = targetTab;
        this.onTabChange(targetTab);
      });
    });
  }

  onTabChange(tabName) {
    switch(tabName) {
      case 'analysis':
        this.initializeAnalysisTab();
        break;
      case 'portfolio':
        this.initializePortfolioTab();
        break;
      case 'risk':
        this.initializeRiskTab();
        break;
      case 'news':
        this.initializeNewsTab();
        break;
    }
  }

  // Analysis Tab Methods
  initializeAnalysisTab() {
    const marketData = this.groupMarket(this.data.market);
    this.populateSelect('tech_ticker_select', marketData.tickers);
    this.populateSelect('candle_ticker_select', marketData.tickers);
    this.populateSelect('volume_ticker_select', marketData.tickers);
    this.populateSelect('correlation_tickers', marketData.tickers);
  }

  updateTechnicalAnalysis() {
    const ticker = document.getElementById('tech_ticker_select').value;
    const indicator = document.getElementById('indicator_select').value;
    
    if (!ticker) return;
    
    const tickerData = this.data.market.filter(d => d.ticker === ticker);
    const prices = tickerData.map(d => d.close);
    
    let indicatorData;
    switch(indicator) {
      case 'sma':
        indicatorData = this.advancedFeatures.calculateSMA(prices, 20);
        break;
      case 'ema':
        indicatorData = this.advancedFeatures.calculateEMA(prices, 20);
        break;
      case 'rsi':
        indicatorData = this.advancedFeatures.calculateRSI(prices);
        break;
      case 'macd':
        indicatorData = this.advancedFeatures.calculateMACD(prices);
        break;
      case 'bollinger':
        indicatorData = this.advancedFeatures.calculateBollingerBands(prices);
        break;
    }
    
    this.renderTechnicalChart('technical_chart', prices, indicatorData, indicator);
  }

  updateCandlestickChart() {
    const ticker = document.getElementById('candle_ticker_select').value;
    if (!ticker) return;
    
    const tickerData = this.data.market.filter(d => d.ticker === ticker);
    this.renderCandlestickChart('candlestick_chart', tickerData);
  }

  updateVolumeAnalysis() {
    const ticker = document.getElementById('volume_ticker_select').value;
    if (!ticker) return;
    
    const tickerData = this.data.market.filter(d => d.ticker === ticker);
    this.renderVolumeChart('volume_chart', tickerData);
  }

  updateCorrelationMatrix() {
    const selectedTickers = Array.from(document.getElementById('correlation_tickers').selectedOptions)
      .map(o => o.value).slice(0, 10);
    
    if (selectedTickers.length < 2) return;
    
    this.renderCorrelationMatrix('correlation_matrix', selectedTickers);
  }

  // Portfolio Tab Methods
  initializePortfolioTab() {
    this.calculatePortfolioMetrics();
  }

  optimizePortfolio() {
    const targetReturn = parseFloat(document.getElementById('target_return').value);
    const riskTolerance = document.getElementById('risk_tolerance').value;
    
    // Mock optimization - in real implementation, this would use actual optimization algorithms
    const mockOptimization = {
      weights: [0.3, 0.25, 0.2, 0.15, 0.1],
      expectedReturn: targetReturn,
      volatility: 0.15,
      sharpeRatio: 0.8
    };
    
    this.renderPortfolioOptimization('portfolio_optimization', mockOptimization);
  }

  rebalancePortfolio() {
    const frequency = document.getElementById('rebalance_frequency').value;
    // Mock rebalancing logic
    this.showSuccess(`Portfolio rebalanced with ${frequency} frequency.`);
  }

  calculatePortfolioMetrics() {
    // Mock portfolio metrics
    const metrics = {
      totalReturn: 0.125,
      sharpeRatio: 0.85,
      maxDrawdown: -0.08,
      volatility: 0.15
    };
    
    document.getElementById('total_return').textContent = this.advancedFeatures.formatPercentage(metrics.totalReturn);
    document.getElementById('sharpe_ratio').textContent = this.advancedFeatures.formatNumber(metrics.sharpeRatio);
    document.getElementById('max_drawdown').textContent = this.advancedFeatures.formatPercentage(metrics.maxDrawdown);
    document.getElementById('volatility').textContent = this.advancedFeatures.formatPercentage(metrics.volatility);
  }

  // Risk Tab Methods
  initializeRiskTab() {
    this.calculateRiskMetrics();
  }

  calculateVaR() {
    const confidence = parseFloat(document.getElementById('var_confidence').value);
    const horizon = parseInt(document.getElementById('var_horizon').value);
    
    // Mock VaR calculation
    const mockReturns = Array.from({length: 100}, () => (Math.random() - 0.5) * 0.1);
    const varValue = this.advancedFeatures.calculateVaR(mockReturns, confidence);
    const expectedShortfall = this.advancedFeatures.calculateExpectedShortfall(mockReturns, confidence);
    
    document.getElementById('var_value').textContent = this.advancedFeatures.formatPercentage(varValue);
    document.getElementById('expected_shortfall').textContent = this.advancedFeatures.formatPercentage(expectedShortfall);
    
    this.renderVaRChart('var_chart', mockReturns, varValue);
  }

  runStressTest() {
    const scenario = document.getElementById('stress_scenario').value;
    // Mock stress test
    this.renderStressTestChart('stress_test_chart', scenario);
  }

  calculateRiskMetrics() {
    // Mock risk metrics
    const metrics = {
      beta: 1.2,
      alpha: 0.05,
      informationRatio: 0.8,
      treynorRatio: 0.12
    };
    
    document.getElementById('beta').textContent = this.advancedFeatures.formatNumber(metrics.beta);
    document.getElementById('alpha').textContent = this.advancedFeatures.formatPercentage(metrics.alpha);
    document.getElementById('information_ratio').textContent = this.advancedFeatures.formatNumber(metrics.informationRatio);
    document.getElementById('treynor_ratio').textContent = this.advancedFeatures.formatNumber(metrics.treynorRatio);
  }

  // News Tab Methods
  initializeNewsTab() {
    const marketData = this.groupMarket(this.data.market);
    this.populateSelect('news_ticker_select', marketData.tickers);
  }

  loadNewsFeed() {
    const newsFeed = document.getElementById('news_feed');
    const mockNews = [
      {
        title: "AI Models Show Promising Results in Stock Prediction",
        content: "Recent research demonstrates significant improvements in financial market prediction using advanced deep learning architectures.",
        date: new Date().toISOString(),
        source: "Financial Research Journal",
        sentiment: { sentiment: 'positive' }
      },
      {
        title: "Portfolio Optimization Algorithms Achieve Superior Risk-Adjusted Returns",
        content: "New optimization techniques show enhanced performance in portfolio management with improved Sharpe ratios.",
        date: new Date(Date.now() - 86400000).toISOString(),
        source: "Quantitative Finance Review",
        sentiment: { sentiment: 'positive' }
      },
      {
        title: "Sentiment Analysis Integration Improves Market Forecasting Accuracy",
        content: "Combining traditional financial data with sentiment analysis from news and social media shows measurable improvements.",
        date: new Date(Date.now() - 172800000).toISOString(),
        source: "Journal of Financial Technology",
        sentiment: { sentiment: 'positive' }
      }
    ];
    
    newsFeed.innerHTML = mockNews.map(news => `
      <div class="news-item">
        <h4>${news.title}</h4>
        <p>${news.content}</p>
        <div class="news-meta">
          <span>${news.source}</span>
          <span class="sentiment-badge sentiment-${news.sentiment.sentiment}">
            ${news.sentiment.sentiment}
          </span>
        </div>
      </div>
    `).join('');
  }

  updateNewsSentiment() {
    const ticker = document.getElementById('news_ticker_select').value;
    const period = document.getElementById('news_period_select').value;
    
    // Mock sentiment analysis
    this.renderSentimentChart('sentiment_chart', ticker, period);
  }

  updateSocialSentiment() {
    const platform = document.getElementById('social_platform').value;
    // Mock social sentiment
    this.renderSocialSentimentChart('social_sentiment_chart', platform);
  }

  // Utility Methods
  exportData(data, filename) {
    this.advancedFeatures.exportToCSV(data, filename);
  }

  openFullscreen(chartId) {
    // Create fullscreen modal
    const modal = document.createElement('div');
    modal.className = 'fullscreen-modal active';
    modal.innerHTML = `
      <div class="fullscreen-content">
        <button class="close-fullscreen">&times;</button>
        <div id="fullscreen-${chartId}"></div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Copy chart to fullscreen
    const originalChart = document.getElementById(chartId);
    const fullscreenChart = document.getElementById(`fullscreen-${chartId}`);
    
    // Close modal
    modal.querySelector('.close-fullscreen').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }

  loadUserPreferences() {
    const saved = localStorage.getItem('deepAriesPreferences');
    return saved ? JSON.parse(saved) : {
      theme: 'light',
      defaultTab: 'dashboard',
      favoriteTickers: []
    };
  }

  saveUserPreferences() {
    localStorage.setItem('deepAriesPreferences', JSON.stringify(this.userPreferences));
  }

  showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
      if (document.body.contains(successDiv)) {
        document.body.removeChild(successDiv);
      }
    }, 3000);
  }

  // Chart Rendering Methods (simplified versions)
  renderTechnicalChart(containerId, prices, indicatorData, indicator) {
    // Simplified technical chart rendering
    const trace = {
      x: Array.from({length: prices.length}, (_, i) => i),
      y: prices,
      type: 'scatter',
      mode: 'lines',
      name: 'Price'
    };
    
    Plotly.newPlot(containerId, [trace], {
      title: `${indicator.toUpperCase()} Analysis`,
      xaxis: { title: 'Time' },
      yaxis: { title: 'Price' }
    });
  }

  renderCandlestickChart(containerId, data) {
    // Simplified candlestick rendering
    const trace = {
      x: data.map(d => d.date),
      open: data.map(d => d.open),
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      close: data.map(d => d.close),
      type: 'candlestick'
    };
    
    Plotly.newPlot(containerId, [trace], {
      title: 'Candlestick Chart',
      xaxis: { title: 'Date' },
      yaxis: { title: 'Price' }
    });
  }

  renderVolumeChart(containerId, data) {
    const trace = {
      x: data.map(d => d.date),
      y: data.map(d => d.volume),
      type: 'bar',
      name: 'Volume'
    };
    
    Plotly.newPlot(containerId, [trace], {
      title: 'Volume Analysis',
      xaxis: { title: 'Date' },
      yaxis: { title: 'Volume' }
    });
  }

  renderCorrelationMatrix(containerId, tickers) {
    // Mock correlation matrix
    const correlationData = tickers.map(() => 
      tickers.map(() => Math.random() * 2 - 1)
    );
    
    const trace = {
      z: correlationData,
      x: tickers,
      y: tickers,
      type: 'heatmap',
      colorscale: 'RdBu'
    };
    
    Plotly.newPlot(containerId, [trace], {
      title: 'Correlation Matrix'
    });
  }

  renderPortfolioOptimization(containerId, optimization) {
    const trace = {
      x: [optimization.volatility],
      y: [optimization.expectedReturn],
      type: 'scatter',
      mode: 'markers',
      marker: { size: 20, color: 'red' },
      name: 'Optimal Portfolio'
    };
    
    Plotly.newPlot(containerId, [trace], {
      title: 'Portfolio Optimization',
      xaxis: { title: 'Volatility' },
      yaxis: { title: 'Expected Return' }
    });
  }

  renderVaRChart(containerId, returns, varValue) {
    const trace = {
      x: returns,
      type: 'histogram',
      name: 'Returns Distribution'
    };
    
    Plotly.newPlot(containerId, [trace], {
      title: `VaR Analysis (VaR: ${this.advancedFeatures.formatPercentage(varValue)})`,
      xaxis: { title: 'Returns' },
      yaxis: { title: 'Frequency' }
    });
  }

  renderStressTestChart(containerId, scenario) {
    const trace = {
      x: Array.from({length: 30}, (_, i) => i),
      y: Array.from({length: 30}, () => Math.random() * 0.2 - 0.1),
      type: 'scatter',
      mode: 'lines',
      name: scenario
    };
    
    Plotly.newPlot(containerId, [trace], {
      title: `Stress Test: ${scenario}`,
      xaxis: { title: 'Time' },
      yaxis: { title: 'Portfolio Value' }
    });
  }

  renderSentimentChart(containerId, ticker, period) {
    const trace = {
      x: Array.from({length: 30}, (_, i) => new Date(Date.now() - (29-i) * 86400000)),
      y: Array.from({length: 30}, () => Math.random() * 2 - 1),
      type: 'scatter',
      mode: 'lines',
      name: 'Sentiment Score'
    };
    
    Plotly.newPlot(containerId, [trace], {
      title: `News Sentiment: ${ticker}`,
      xaxis: { title: 'Date' },
      yaxis: { title: 'Sentiment Score' }
    });
  }

  renderSocialSentimentChart(containerId, platform) {
    const trace = {
      x: Array.from({length: 24}, (_, i) => i),
      y: Array.from({length: 24}, () => Math.random() * 2 - 1),
      type: 'scatter',
      mode: 'lines',
      name: platform
    };
    
    Plotly.newPlot(containerId, [trace], {
      title: `Social Media Sentiment: ${platform}`,
      xaxis: { title: 'Hour' },
      yaxis: { title: 'Sentiment Score' }
    });
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Register Service Worker for PWA functionality
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  }

  // Initialize dashboard
  new StockDashboard();
});
