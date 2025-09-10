/**
 * Deep Aries - Stock Dashboard JavaScript
 * GitHub Pages optimized static dashboard with advanced features
 */

class DeepAriesDashboard {
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
    
    // Initialize new modules
    this.technicalAnalysis = new TechnicalAnalysis();
    this.riskManagement = new RiskManagement();
    this.chartUtils = new ChartUtils();
    
    // Configuration for external data sources
    this.config = {
      useExternalData: false, // Disabled for Market Data: use local market_past.csv
      alphaVantageKey: null, // Add your Alpha Vantage API key here
      customAPIUrl: null, // Add your custom API URL here
      yahooFinanceEnabled: true, // Enable Yahoo Finance (free)
      dataRefreshInterval: 300000, // 5 minutes in milliseconds
      
      // Error handling and fallback options
      enableMockData: true, // Generate mock data when external sources fail
      maxRetries: 3, // Maximum retry attempts for failed requests
      requestTimeout: 10000, // Request timeout in milliseconds
      rateLimitDelay: 1000, // Delay between requests to avoid rate limiting
      enableCorsProxy: true, // Use CORS proxy for external requests
      corsProxyUrl: 'https://api.allorigins.win/raw?url=', // CORS proxy URL
      
      // Data source priority (fallback order)
      dataSourcePriority: ['yahoo', 'alphaVantage', 'custom', 'mock'],
      
      // Cache settings
      enableCache: true,
      cacheExpiry: 300000, // 5 minutes cache expiry
      cacheKey: 'deepAries_data_cache'
    };
    
    this.init();
  }
  
  /**
   * Start auto-refreshing market data using external sources
   */
  startMarketAutoRefresh(tickers, dateRange) {
    try {
      if (!Array.isArray(tickers) || tickers.length === 0) return;
      if (this._marketRefreshTimer) {
        clearInterval(this._marketRefreshTimer);
      }
      const intervalMs = this.config.dataRefreshInterval || 300000;
      const runFetch = async () => {
        try {
          const data = await this.loadYahooFinanceData(tickers, '1y', '1d');
          if (data && data.market && data.market.length > 0) {
            // Merge with current data and re-render
            const merged = [...(this.data.market || []), ...data.market];
            merged.sort((a, b) => new Date(a.date) - new Date(b.date));
            this.data.market = merged;
            const byTicker = this.groupMarket(this.data.market);
            this.renderTimeSeries('timeseries', byTicker.byTicker, tickers, dateRange.startDate, dateRange.endDate);
          }
        } catch (e) {
          console.warn('[REFRESH] External refresh failed:', e.message);
        }
      };
      // initial run
      runFetch();
      // schedule
      this._marketRefreshTimer = setInterval(runFetch, intervalMs);
    } catch (error) {
      console.warn('[WARN] Failed to start auto refresh:', error.message);
    }
  }

  async init() {
    try {
      console.log('[INIT] Initializing DeepAries Dashboard...');
      this.updateDebugInfo('[INIT] Initializing DeepAries Dashboard...');
      
      // Check if required libraries are loaded
      if (typeof Plotly === 'undefined') {
        console.error('[ERROR] Plotly is not loaded');
        this.updateDebugInfo('[ERROR] Plotly is not loaded');
        return;
      }
      
      if (typeof Papa === 'undefined') {
        console.error('[ERROR] PapaParse is not loaded');
        this.updateDebugInfo('[ERROR] PapaParse is not loaded');
        return;
      }
      
      console.log('[SUCCESS] Required libraries loaded');
      this.updateDebugInfo('[SUCCESS] Required libraries loaded');
      
      // Load data first
      await this.loadAllData();
      console.log('[SUCCESS] Data loaded successfully');
      this.updateDebugInfo('[SUCCESS] Data loaded successfully');
      
      // Wait a bit for DOM to be fully ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Initialize advanced features if available
      
      // Setup event listeners
      this.setupEventListeners();
      console.log('[SUCCESS] Event listeners setup complete');
      this.updateDebugInfo('[SUCCESS] Event listeners setup complete');
      
      // Render initial charts
      this.renderInitialCharts();
      console.log('[SUCCESS] Dashboard initialized successfully');
      this.updateDebugInfo('[SUCCESS] Dashboard initialized successfully');

      // If Portfolio tab is the default active tab, initialize it now
      try {
        const activeTabBtn = document.querySelector('.tab-button.active');
        if (activeTabBtn && activeTabBtn.dataset.tab === 'portfolio') {
          this.initializePortfolioTab();
        }
      } catch (_) {}
    } catch (error) {
      console.error('[ERROR] Error initializing dashboard:', error);
      this.updateDebugInfo('[ERROR] Error: ' + error.message);
      this.showError('Error loading data: ' + error.message);
    }
  }

  async loadAllData() {
    console.log('[DATA] Loading all data files...');
    
    // Use ONLY market_past.csv for Market Data
    let marketPast, future, result, test;
    const dataFiles = [
      'data/market_past.csv',
      'data/future.csv',
      'data/result.csv',
      'data/test.csv'
    ];

    [marketPast, future, result, test] = await Promise.all(
      dataFiles.map(file => this.loadCSV(file))
    );

      // Market Data uses only market_past rows
      const combinedMarket = [...(marketPast || [])];
      
      // Sort by date to ensure chronological order
      combinedMarket.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      this.data = { 
        market: combinedMarket, 
        marketPast, 
        future, 
        result, 
        test 
      };
      
      // Set data for new modules
      this.technicalAnalysis.setData(combinedMarket);
      this.riskManagement.setData(combinedMarket);
      
      console.log('[SUCCESS] All data loaded:', {
        market: this.data.market?.length || 0,
        marketPast: this.data.marketPast?.length || 0,
        future: this.data.future?.length || 0,
        result: this.data.result?.length || 0,
        test: this.data.test?.length || 0
      });
      
      // Initialize Technical Analysis and Risk Management tabs after data is loaded
      setTimeout(() => {
        this.initializeAnalysisTab();
        this.initializeRiskTab();
        console.log('[SUCCESS] Technical Analysis and Risk Management tabs initialized');
      }, 200);
      
      // Log available markets for debugging
      this.logAvailableMarkets();
      
      console.log('[DATA] Market data from market_past only:', {
        pastData: marketPast?.length || 0,
        totalCombined: combinedMarket.length
      });
      
      // Log sample data for debugging
      if (combinedMarket.length > 0) {
        const sampleTickers = [...new Set(combinedMarket.map(d => d.ticker))].slice(0, 5);
        console.log('[DATA] Sample tickers:', sampleTickers);
        
        sampleTickers.forEach(ticker => {
          const tickerData = combinedMarket.filter(d => d.ticker === ticker);
          if (tickerData.length > 0) {
            console.log(`[DATA] ${ticker}: ${tickerData.length} data points, first: ${tickerData[0].date}, last: ${tickerData[tickerData.length-1].date}`);
          }
        });
        
        // Check for 000786.SZ specifically
        const targetTicker = '000786.SZ';
        const targetData = combinedMarket.filter(d => d.ticker === targetTicker);
        console.log(`[DEBUG] ${targetTicker} data points:`, targetData.length);
        if (targetData.length > 0) {
          console.log(`[DEBUG] ${targetTicker} date range:`, targetData[0].date, 'to', targetData[targetData.length-1].date);
        }
      }
  }

  /**
   * Load external data from APIs or other sources
   */
  async loadExternalData() {
    try {
      // Check cache first
      if (this.config.enableCache) {
        const cachedData = this.getCachedData();
        if (cachedData) {
          console.log('[CACHE] Using cached external data');
          return cachedData;
        }
      }
      
      // Try data sources in priority order
      for (const source of this.config.dataSourcePriority) {
        try {
          let data = null;
          
          switch (source) {
            case 'yahoo':
              if (this.config.yahooFinanceEnabled) {
                // Prefer UI-selected tickers if available
                const selected = this.getSelectedMarketTickers?.() || [];
                data = await this.loadYahooFinanceData(selected, '1y', '1d');
              }
              break;
            case 'alphaVantage':
              if (this.config.alphaVantageKey) {
                data = await this.loadAlphaVantageData();
              }
              break;
            case 'custom':
              if (this.config.customAPIUrl) {
                data = await this.loadCustomAPIData();
              }
              break;
            case 'mock':
              if (this.config.enableMockData) {
                data = this.generateMockDataForAllTickers();
              }
              break;
          }
          
          if (data && this.isValidData(data)) {
            console.log(`[SUCCESS] Loaded data from ${source}`);
            
            // Cache the data
            if (this.config.enableCache) {
              this.setCachedData(data);
            }
            
            return data;
          }
          
        } catch (error) {
          console.warn(`[WARN] Failed to load from ${source}:`, error.message);
          continue;
        }
      }
      
      console.error('[ERROR] All external data sources failed');
      return null;
      
    } catch (error) {
      console.error('[ERROR] External data loading failed:', error);
      return null;
    }
  }

  /**
   * Load data from Yahoo Finance (free, no API key)
   * Enhanced with CORS proxy and error handling
   */
  async loadYahooFinanceData(inputTickers = null, range = '1y', interval = '1d') {
    try {
      console.log('[EXTERNAL] Loading Yahoo Finance data...');
      
      // Check if we're in a browser environment that supports CORS
      if (typeof window === 'undefined') {
        console.warn('[WARN] Yahoo Finance API requires browser environment');
        return null;
      }
      
      // Use CORS proxy to avoid CORS issues
      const corsProxy = 'https://api.allorigins.win/raw?url=';
      const tickers = Array.isArray(inputTickers) && inputTickers.length > 0
        ? inputTickers
        : ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
      
      // Load tickers with retry mechanism and rate limiting
      const results = [];
      for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];
        
        try {
          // Add delay between requests to avoid rate limiting
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          const url = `${corsProxy}${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=${interval}`)}`;
          
          const response = await this.fetchWithTimeout(url, 10000); // 10 second timeout
          
          if (!response.ok) {
            console.warn(`[WARN] HTTP ${response.status} for ${ticker}`);
            continue;
          }
          
          const data = await response.json();
          const parsedData = this.parseYahooData(ticker, data);
          
          if (parsedData && parsedData.length > 0) {
            results.push(parsedData);
            console.log(`[SUCCESS] Loaded ${ticker}: ${parsedData.length} data points`);
          } else {
            console.warn(`[WARN] No valid data for ${ticker}`);
          }
          
        } catch (error) {
          console.warn(`[WARN] Failed to load ${ticker}:`, error.message);
          
          // Try alternative data source for this ticker
          const alternativeData = await this.loadAlternativeData(ticker);
          if (alternativeData) {
            results.push(alternativeData);
          }
        }
      }
      
      if (results.length > 0) {
        return this.formatExternalData(results);
      }
      
      return null;
    } catch (error) {
      console.error('[ERROR] Yahoo Finance data loading failed:', error);
      return null;
    }
  }

  /**
   * Fetch with timeout and retry mechanism
   */
  async fetchWithTimeout(url, timeout = 10000, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; DeepAries/1.0)'
          }
        });
        
        clearTimeout(timeoutId);
        return response;
        
      } catch (error) {
        console.warn(`[WARN] Fetch attempt ${attempt} failed:`, error.message);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  /**
   * Load alternative data source when primary fails
   */
  async loadAlternativeData(ticker) {
    try {
      console.log(`[ALTERNATIVE] Trying alternative source for ${ticker}...`);
      
      // Option 1: Try different Yahoo Finance endpoint
      const alternativeUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`;
      const corsProxy = 'https://api.allorigins.win/raw?url=';
      
      const response = await this.fetchWithTimeout(`${corsProxy}${encodeURIComponent(alternativeUrl)}`, 5000);
      
      if (response.ok) {
        const data = await response.json();
        return this.parseAlternativeYahooData(ticker, data);
      }
      
      // Option 2: Generate mock data for demo purposes
      return this.generateMockData(ticker);
      
    } catch (error) {
      console.warn(`[WARN] Alternative data loading failed for ${ticker}:`, error);
      return this.generateMockData(ticker);
    }
  }

  /**
   * Parse alternative Yahoo Finance response
   */
  parseAlternativeYahooData(ticker, data) {
    try {
      if (data.quoteResponse && data.quoteResponse.result && data.quoteResponse.result.length > 0) {
        const quote = data.quoteResponse.result[0];
        const currentPrice = quote.regularMarketPrice;
        const previousClose = quote.regularMarketPreviousClose;
        
        // Generate simple time series with current and previous price
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        return [
          {
            date: yesterday.toISOString().split('T')[0],
            ticker: ticker,
            close: previousClose,
            open: previousClose,
            high: previousClose * 1.02,
            low: previousClose * 0.98,
            volume: 1000000
          },
          {
            date: today.toISOString().split('T')[0],
            ticker: ticker,
            close: currentPrice,
            open: previousClose,
            high: currentPrice * 1.01,
            low: currentPrice * 0.99,
            volume: 1000000
          }
        ];
      }
      
      return null;
    } catch (error) {
      console.error('[ERROR] Failed to parse alternative Yahoo data:', error);
      return null;
    }
  }

  /**
   * Generate mock data for demo purposes
   */
  generateMockData(ticker) {
    console.log(`[MOCK] Generating mock data for ${ticker}...`);
    
    const mockData = [];
    const basePrice = 100 + Math.random() * 200; // Random base price between 100-300
    const today = new Date();
    
    // Generate 30 days of mock data
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const priceChange = (Math.random() - 0.5) * 10; // Random price change
      const price = Math.max(1, basePrice + priceChange);
      
      mockData.push({
        date: date.toISOString().split('T')[0],
        ticker: ticker,
        close: price,
        open: price + (Math.random() - 0.5) * 2,
        high: price + Math.random() * 5,
        low: price - Math.random() * 5,
        volume: Math.floor(Math.random() * 10000000) + 1000000
      });
    }
    
    return mockData;
  }

  /**
   * Generate mock data for all tickers
   */
  generateMockDataForAllTickers() {
    const tickers = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
    const allData = [];
    
    tickers.forEach(ticker => {
      const mockData = this.generateMockData(ticker);
      allData.push(...mockData);
    });
    
    return {
      market: allData,
      marketPast: [],
      future: [],
      result: [],
      test: []
    };
  }

  /**
   * Validate external data
   */
  isValidData(data) {
    return data && 
           data.market && 
           Array.isArray(data.market) && 
           data.market.length > 0 &&
           data.market[0].hasOwnProperty('date') &&
           data.market[0].hasOwnProperty('ticker') &&
           data.market[0].hasOwnProperty('close');
  }

  /**
   * Get cached data
   */
  getCachedData() {
    try {
      const cached = localStorage.getItem(this.config.cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();
        
        if (data.timestamp && (now - data.timestamp) < this.config.cacheExpiry) {
          return data.data;
        } else {
          // Cache expired
          localStorage.removeItem(this.config.cacheKey);
        }
      }
    } catch (error) {
      console.warn('[WARN] Failed to read cache:', error);
    }
    
    return null;
  }

  /**
   * Set cached data
   */
  setCachedData(data) {
    try {
      const cacheData = {
        data: data,
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.config.cacheKey, JSON.stringify(cacheData));
      console.log('[CACHE] Data cached successfully');
    } catch (error) {
      console.warn('[WARN] Failed to cache data:', error);
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    try {
      localStorage.removeItem(this.config.cacheKey);
      console.log('[CACHE] Cache cleared');
    } catch (error) {
      console.warn('[WARN] Failed to clear cache:', error);
    }
  }

  /**
   * Parse Yahoo Finance API response
   */
  parseYahooData(ticker, data) {
    try {
      const chart = data.chart.result[0];
      const timestamps = chart.timestamp;
      const closes = chart.indicators.quote[0].close;
      
      return timestamps.map((timestamp, index) => ({
        date: new Date(timestamp * 1000).toISOString().split('T')[0],
        ticker: ticker,
        close: closes[index],
        open: chart.indicators.quote[0].open[index],
        high: chart.indicators.quote[0].high[index],
        low: chart.indicators.quote[0].low[index],
        volume: chart.indicators.quote[0].volume[index]
      })).filter(item => item.close !== null);
    } catch (error) {
      console.error('[ERROR] Failed to parse Yahoo data:', error);
      return null;
    }
  }

  /**
   * Format external data to match internal structure
   */
  formatExternalData(externalData) {
    const allData = externalData.flat();
    
    return {
      market: allData,
      marketPast: [], // External data is already historical
      future: [], // Would need prediction API
      result: [], // Would need portfolio results
      test: [] // Would need test data
    };
  }

  /**
   * Load data from Alpha Vantage API (requires free API key)
   */
  async loadAlphaVantageData() {
    try {
      const apiKey = this.config?.alphaVantageKey;
      if (!apiKey) {
        console.log('[INFO] Alpha Vantage API key not configured');
        return null;
      }
      
      console.log('[EXTERNAL] Loading Alpha Vantage data...');
      // Implementation for Alpha Vantage API
      // This would require API key setup
      
      return null;
    } catch (error) {
      console.error('[ERROR] Alpha Vantage data loading failed:', error);
      return null;
    }
  }

  /**
   * Load data from custom API endpoint
   */
  async loadCustomAPIData() {
    try {
      const apiUrl = this.config?.customAPIUrl;
      if (!apiUrl) {
        console.log('[INFO] Custom API URL not configured');
        return null;
      }
      
      console.log('[EXTERNAL] Loading custom API data...');
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      return this.formatCustomAPIData(data);
    } catch (error) {
      console.error('[ERROR] Custom API data loading failed:', error);
      return null;
    }
  }

  /**
   * Format custom API data
   */
  formatCustomAPIData(data) {
    // Convert custom API response to internal format
    return {
      market: data.market || [],
      marketPast: data.marketPast || [],
      future: data.future || [],
      result: data.result || [],
      test: data.test || []
    };
  }

  async loadCSV(url) {
    try {
      console.log('[LOAD] Loading CSV:', url);
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        console.error(`[ERROR] Failed to fetch ${url}:`, res.status, res.statusText);
        throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
      }
      const text = await res.text();
      
      return new Promise((resolve) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (result) => {
            console.log(`[SUCCESS] Loaded ${url}:`, result.data.length, 'rows');
            resolve(result.data);
          },
          error: (error) => {
            console.error(`[ERROR] Error parsing ${url}:`, error);
            resolve([]); // Return empty array instead of throwing
          }
        });
      });
    } catch (error) {
      console.error(`[ERROR] Error loading ${url}:`, error);
      return []; // Return empty array instead of throwing
    }
  }

  setupEventListeners() {
    console.log('[SETUP] Setting up event listeners...');
    
    // Dashboard tab events
    const updateMarketBtn = document.getElementById('update_market_btn');
    if (updateMarketBtn) {
      updateMarketBtn.addEventListener('click', () => {
        try {
          console.log('[CLICK] Market update button clicked');
          this.updateDebugInfo('[CLICK] Market update button clicked');
          
          const tickerSelect = document.getElementById('market_ticker_select');
          if (!tickerSelect) {
            console.error('[ERROR] Market ticker select not found');
            this.updateDebugInfo('[ERROR] Market ticker select not found');
            return;
          }
          
          const selected = Array.from(tickerSelect.selectedOptions)
            .map(o => o.value);
          console.log('[SELECT] Selected tickers:', selected);
          this.updateDebugInfo(`[SELECT] Selected tickers: ${selected.join(', ')}`);
          // expose selected tickers for external fetches
          this.getSelectedMarketTickers = () => selected;
          
          if (selected.length === 0) {
            console.warn('[WARN] No tickers selected');
            this.updateDebugInfo('[WARN] No tickers selected');
            return;
          }
          
          const dateRange = this.getSelectedDateRange();
          console.log('[DATE] Date range:', dateRange);
          
          if (!this.data.market || this.data.market.length === 0) {
            console.error('[ERROR] No market data available');
            this.updateDebugInfo('[ERROR] No market data available');
            return;
          }
          
          const marketVal = (document.getElementById('market_market_select')||{}).value;
          const filteredRows = marketVal ? this.data.market.filter(r => r.market === marketVal) : this.data.market;
          const marketData = this.groupMarket(filteredRows);
          this.renderTimeSeries('timeseries', marketData.byTicker, selected, dateRange.startDate, dateRange.endDate);
          console.log('[SUCCESS] Market data updated successfully');
          this.updateDebugInfo('[SUCCESS] Market data updated successfully');
          // kick off/refresh auto refresh from external APIs when enabled
          if (this.config.useExternalData && this.startMarketAutoRefresh) {
            this.startMarketAutoRefresh(selected, dateRange);
          }
        } catch (error) {
          console.error('[ERROR] Error updating market data:', error);
          this.updateDebugInfo('[ERROR] Error updating market data: ' + error.message);
        }
      });
      console.log('[SUCCESS] Market update button listener added');
    } else {
      console.warn('[WARN] Market update button not found');
    }

    // In manual-update mode, ticker change does not auto-render

    // Date range selection
    const dateRangeSelect = document.getElementById('date_range_select');
    if (dateRangeSelect) {
      dateRangeSelect.addEventListener('change', () => {
        this.handleDateRangeChange();
      });
      console.log('[SUCCESS] Date range select listener added');
    }

    const updateResultBtn = document.getElementById('update_result_btn');
    if (updateResultBtn) {
      updateResultBtn.addEventListener('click', () => {
        this.updateResultSection();
      });
      console.log('[SUCCESS] Result update button listener added');
    } else {
      console.warn('[WARN] Result update button not found');
    }

    const updateIndexBtn = document.getElementById('update_index_btn');
    if (updateIndexBtn) {
      updateIndexBtn.addEventListener('click', () => {
        const selected = document.getElementById('index_market_select').value;
        this.renderIndexSeries('index_series', this.data.test, selected);
      });
      console.log('[SUCCESS] Index update button listener added');
    } else {
      console.warn('[WARN] Index update button not found');
    }

    // Test buttons
    const testRenderBtn = document.getElementById('test_render_btn');
    if (testRenderBtn) {
      testRenderBtn.addEventListener('click', () => {
        console.log('[TEST] Test render button clicked');
        this.updateDebugInfo('[TEST] Test render button clicked');
        this.testRender();
      });
      console.log('[SUCCESS] Test render button listener added');
    } else {
      console.warn('[WARN] Test render button not found');
    }

    const forceRenderBtn = document.getElementById('force_render_btn');
    if (forceRenderBtn) {
      forceRenderBtn.addEventListener('click', () => {
        console.log('[FORCE] Force render button clicked');
        this.updateDebugInfo('[FORCE] Force render button clicked');
        this.forceRender();
      });
      console.log('[SUCCESS] Force render button listener added');
    } else {
      console.warn('[WARN] Force render button not found');
    }

    // Export buttons
    const exportMarketBtn = document.getElementById('export_market_btn');
    if (exportMarketBtn) {
      exportMarketBtn.addEventListener('click', () => {
        this.exportData(this.data.market, 'market_data.csv');
      });
      console.log('[SUCCESS] Export market button listener added');
    }

    const exportHeatmapBtn = document.getElementById('export_heatmap_btn');
    if (exportHeatmapBtn) {
      exportHeatmapBtn.addEventListener('click', () => {
        this.exportData(this.data.future, 'future_predictions.csv');
      });
      console.log('[SUCCESS] Export heatmap button listener added');
    }

    const exportResultBtn = document.getElementById('export_result_btn');
    if (exportResultBtn) {
      exportResultBtn.addEventListener('click', () => {
        this.exportData(this.data.result, 'portfolio_results.csv');
      });
      console.log('[SUCCESS] Export result button listener added');
    }

    const exportIndexBtn = document.getElementById('export_index_btn');
    if (exportIndexBtn) {
      exportIndexBtn.addEventListener('click', () => {
        this.exportData(this.data.test, 'index_data.csv');
      });
      console.log('[SUCCESS] Export index button listener added');
    }

    // Fullscreen button
    const fullscreenHeatmapBtn = document.getElementById('fullscreen_heatmap_btn');
    if (fullscreenHeatmapBtn) {
      fullscreenHeatmapBtn.addEventListener('click', () => {
        this.openFullscreen('heatmap');
      });
      console.log('[SUCCESS] Fullscreen heatmap button listener added');
    }

    // Analysis tab events
    const updateTechBtn = document.getElementById('update_tech_btn');
    if (updateTechBtn) {
      updateTechBtn.addEventListener('click', () => {
        this.updateTechnicalAnalysis();
      });
      console.log('[SUCCESS] Technical analysis button listener added');
    }

    const updateCandleBtn = document.getElementById('update_candle_btn');
    if (updateCandleBtn) {
      updateCandleBtn.addEventListener('click', () => {
        this.updateCandlestickChart();
      });
      console.log('[SUCCESS] Candlestick button listener added');
    }

    const updateVolumeBtn = document.getElementById('update_volume_btn');
    if (updateVolumeBtn) {
      updateVolumeBtn.addEventListener('click', () => {
        this.updateVolumeAnalysis();
      });
      console.log('[SUCCESS] Volume analysis button listener added');
    }

    const updateCorrelationBtn = document.getElementById('update_correlation_btn');
    if (updateCorrelationBtn) {
      updateCorrelationBtn.addEventListener('click', () => {
        this.updateCorrelationMatrix();
      });
      console.log('[SUCCESS] Correlation matrix button listener added');
    }

    // Portfolio tab events
    const optimizePortfolioBtn = document.getElementById('optimize_portfolio_btn');
    if (optimizePortfolioBtn) {
      optimizePortfolioBtn.addEventListener('click', () => {
        this.optimizePortfolio();
      });
      console.log('[SUCCESS] Optimize portfolio button listener added');
    }

    const rebalanceBtn = document.getElementById('rebalance_btn');
    if (rebalanceBtn) {
      rebalanceBtn.addEventListener('click', () => {
        this.rebalancePortfolio();
      });
      console.log('[SUCCESS] Rebalance button listener added');
    }

    // Risk tab events
    const calculateVarBtn = document.getElementById('calculate_var_btn');
    if (calculateVarBtn) {
      calculateVarBtn.addEventListener('click', () => {
        this.calculateVaR();
      });
      console.log('[SUCCESS] Calculate VaR button listener added');
    }

    const runStressTestBtn = document.getElementById('run_stress_test_btn');
    if (runStressTestBtn) {
      runStressTestBtn.addEventListener('click', () => {
        this.runStressTest();
      });
      console.log('[SUCCESS] Run stress test button listener added');
    }

    const calculateRiskMetricsBtn = document.getElementById('calculate_risk_metrics_btn');
    if (calculateRiskMetricsBtn) {
      calculateRiskMetricsBtn.addEventListener('click', () => {
        this.calculateRiskMetrics();
      });
      console.log('[SUCCESS] Calculate risk metrics button listener added');
    }

  }

  renderInitialCharts() {
    console.log('[RENDER] Rendering initial charts...');
    this.updateDebugInfo('[RENDER] Rendering initial charts...');
    
    try {
      // Combined Market data (Dashboard tab) - with default values
      if (this.data.market && this.data.market.length > 0) {
        console.log('[DATA] Processing market data:', this.data.market.length, 'rows');
        this.updateDebugInfo(`[DATA] Processing market data: ${this.data.market.length} rows`);
        
        try {
          const marketData = this.groupMarket(this.data.market);
          console.log('[DATA] Grouped market data:', Object.keys(marketData.byTicker).length, 'tickers');
          this.updateDebugInfo(`[DATA] Grouped market data: ${Object.keys(marketData.byTicker).length} tickers`);
          
          if (marketData.tickers && marketData.tickers.length > 0) {
            // Populate market select and filter tickers by selected market
            const markets = this.unique(this.data.market.map(r => r.market).filter(Boolean)).sort();
            this.populateSelect('market_market_select', markets);

            const marketSelect = document.getElementById('market_market_select');
            const applyMarketFilter = () => {
              const marketVal = marketSelect?.value || markets[0];
              const filteredRows = this.data.market.filter(r => r.market === marketVal);
              const tickersInMarket = this.unique(filteredRows.map(r => r.ticker)).sort();
              this.populateSelect('market_ticker_select', tickersInMarket);

              // Default to three representative DJ30 tickers if available; otherwise first 3 in market
              const dj30Defaults = ['AAPL', 'MSFT', 'JPM'];
              const defaultTickers = dj30Defaults.filter(t => tickersInMarket.includes(t)).slice(0, 3);
              const finalDefaults = defaultTickers.length === 3 ? defaultTickers : tickersInMarket.slice(0, 3);
              console.log('[SELECT] Default tickers selected:', finalDefaults);
              this.updateDebugInfo(`[SELECT] Default tickers selected: ${finalDefaults.join(', ')}`);
              this.setDefaultTickers(finalDefaults);

              // Render with current date range for selected market rows only
              const dateRange = this.getSelectedDateRange();
              const byTicker = this.groupMarket(filteredRows).byTicker;
              this.renderTimeSeries('timeseries', byTicker, finalDefaults, dateRange.startDate, dateRange.endDate);
            };

            if (marketSelect) {
              // Only repopulate tickers on market change; do not auto-render
              marketSelect.addEventListener('change', applyMarketFilter);
            }
            // Initialize tickers for default market, but do not draw until Update
            applyMarketFilter();
            
            // Set default date range
            this.setDefaultDateRange();
            
            // Wait for DOM updates and ensure proper initialization
            setTimeout(() => {
              try {
                // Get default date range
                const dateRange = this.getSelectedDateRange();
                console.log('[DATE] Default date range for initial render:', dateRange);
                
                // Verify we have data before rendering
                if (!marketData.byTicker || Object.keys(marketData.byTicker).length === 0) {
                  console.error('[ERROR] No market data available for rendering');
                  this.updateDebugInfo('[ERROR] No market data available for rendering');
                  return;
                }
                
                // Do not auto-render on load; rely on Update button
                console.log('[INFO] Market and tickers initialized; waiting for Update click to render');
                this.updateDebugInfo('[INFO] Ready to render after Update click');
              } catch (error) {
                console.error('[ERROR] Error rendering initial chart:', error);
                this.updateDebugInfo('[ERROR] Error rendering initial chart: ' + error.message);
              }
            }, 200);
          } else {
            console.warn('[WARN] No tickers found in market data');
            this.updateDebugInfo('[WARN] No tickers found in market data');
          }
        } catch (error) {
          console.error('[ERROR] Error processing market data:', error);
          this.updateDebugInfo('[ERROR] Error processing market data: ' + error.message);
        }
      } else {
        console.warn('[WARN] No market data available');
        this.updateDebugInfo('[WARN] No market data available');
      }

      // Future heatmap
      if (this.data.future && this.data.future.length > 0) {
        console.log('[FUTURE] Processing future data:', this.data.future.length, 'rows');
        const futureData = this.buildFutureMatrix(this.data.future);
        this.renderHeatmap('heatmap', futureData);
        console.log('[SUCCESS] Future heatmap rendered');
        this.updateDebugInfo('[SUCCESS] Future heatmap rendered');
      } else {
        console.warn('[WARN] No future data available');
        this.updateDebugInfo('[WARN] No future data available');
      }

      // Result data - with default values
      try {
        if (this.data.result && this.data.result.length > 0) {
          console.log('[RESULT] Processing result data:', this.data.result.length, 'rows');
          this.setupResultSection();
          console.log('[SUCCESS] Result section setup');
          this.updateDebugInfo('[SUCCESS] Result section setup');
        } else {
          console.warn('[WARN] No result data available');
          this.updateDebugInfo('[WARN] No result data available');
        }
      } catch (resultError) {
        console.error('[ERROR] Error processing result data:', resultError);
        this.updateDebugInfo('[ERROR] Error processing result data: ' + resultError.message);
      }

      // Test data - with default values
      try {
        if (this.data.test && this.data.test.length > 0) {
          console.log('[TEST] Processing test data:', this.data.test.length, 'rows');
          const indexMarkets = this.unique(this.data.test.map(r => r.market).filter(Boolean)).sort();
          console.log('[TEST] Available markets:', indexMarkets);
          this.populateSelect('index_market_select', indexMarkets);
          
          // Select first market by default and render immediately
          const defaultMarket = indexMarkets[0];
          console.log('[TEST] Rendering with default market:', defaultMarket);
          
          // Add a small delay to ensure DOM is ready
          setTimeout(() => {
            this.renderIndexSeries('index_series', this.data.test, defaultMarket);
            console.log('[SUCCESS] Index series chart rendered with default market:', defaultMarket);
            this.updateDebugInfo(`[SUCCESS] Index series chart rendered with market: ${defaultMarket}`);
          }, 100);
        } else {
          console.warn('[WARN] No test data available');
          this.updateDebugInfo('[WARN] No test data available');
        }
      } catch (testError) {
        console.error('[ERROR] Error processing test data:', testError);
        this.updateDebugInfo('[ERROR] Error processing test data: ' + testError.message);
      }
      
      console.log('[SUCCESS] Initial charts rendered with default values');
      this.updateDebugInfo('[SUCCESS] Initial charts rendered with default values');
    } catch (error) {
      console.error('[ERROR] Error rendering charts:', error);
      this.updateDebugInfo('[ERROR] Error rendering charts: ' + error.message);
    }
  }


  groupMarket(rows) {
    console.log('[GROUP] Grouping market data:', rows ? rows.length : 0, 'rows');
    
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      console.warn('[WARN] No market data provided to groupMarket');
      this.updateDebugInfo('[WARN] No market data provided to groupMarket');
      return { byTicker: {}, tickers: [] };
    }
    
    try {
      const filteredRows = rows.filter(r => r && r.date && r.ticker && r.close != null);
      console.log('[FILTER] Filtered rows:', filteredRows.length, 'valid rows');
      this.updateDebugInfo(`[FILTER] Filtered rows: ${filteredRows.length} valid rows`);
      
      if (filteredRows.length === 0) {
        console.warn('[WARN] No valid rows after filtering');
        this.updateDebugInfo('[WARN] No valid rows after filtering');
        return { byTicker: {}, tickers: [] };
      }
      
      filteredRows.sort((a, b) => new Date(a.date) - new Date(b.date));

      const byTicker = {};
      const tickers = new Set();

      for (const r of filteredRows) {
        tickers.add(r.ticker);
        if (!byTicker[r.ticker]) byTicker[r.ticker] = { date: [], close: [] };
        byTicker[r.ticker].date.push(r.date);
        byTicker[r.ticker].close.push(r.close);
      }
      
      const result = { byTicker, tickers: Array.from(tickers).sort() };
      console.log('[GROUP] Grouped result:', Object.keys(byTicker).length, 'tickers');
      console.log('[GROUP] Tickers:', result.tickers);
      this.updateDebugInfo(`[GROUP] Grouped result: ${Object.keys(byTicker).length} tickers`);
      
      return result;
    } catch (error) {
      console.error('[ERROR] Error in groupMarket:', error);
      this.updateDebugInfo('[ERROR] Error in groupMarket: ' + error.message);
      return { byTicker: {}, tickers: [] };
    }
  }

  renderTimeSeries(elemId, byTicker, chosenTickers, startDate = null, endDate = null) {
    console.log(`[RENDER] Rendering time series for ${elemId}`);
    console.log('[DATA] Available tickers:', Object.keys(byTicker));
    console.log('[DATA] Chosen tickers:', chosenTickers);
    console.log('[DATE] Date range:', startDate, 'to', endDate);
    
    const traces = [];
    const selected = chosenTickers && chosenTickers.length ? chosenTickers : Object.keys(byTicker).slice(0, 5);
    console.log('[SELECT] Selected tickers for rendering:', selected);
    
    for (const t of selected) {
      const s = byTicker[t];
      if (!s) {
        console.warn(`[WARN] No data for ticker: ${t}`);
        continue;
      }
      
      // Filter data by date range if provided
      let filteredDates = s.date;
      let filteredCloses = s.close;
      
      if (startDate || endDate) {
        const filteredData = this.filterDataByDateRange(s.date, s.close, startDate, endDate);
        filteredDates = filteredData.dates;
        filteredCloses = filteredData.closes;
      }
      
      console.log(`[PROCESS] Processing ticker ${t}:`, filteredDates.length, 'data points');
      
      // Convert dates to proper format for Plotly
      const plotlyDates = [];
      const plotlyCloses = [];
      
      for (let i = 0; i < filteredDates.length; i++) {
        try {
          const dateStr = filteredDates[i];
          const closeValue = filteredCloses[i];
          
          // Parse the date string - handle various formats and timezones
          let date;
          const hasT = /T/.test(dateStr);
          const hasTimezone = /[\+\-]\d{2}:\d{2}$/.test(dateStr);
          const hasSpace = /\s/.test(dateStr);
          const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

          if (hasT || hasTimezone) {
            // ISO or has explicit timezone, normalize space to 'T' if present
            const iso = hasSpace ? dateStr.replace(' ', 'T') : dateStr;
            date = new Date(iso);
          } else if (hasSpace) {
            // Datetime without timezone
            date = new Date(dateStr.replace(' ', 'T'));
          } else if (isDateOnly) {
            // Date only
            date = new Date(dateStr + 'T00:00:00');
          } else {
            // Fallback
            date = new Date(dateStr);
          }
          
          if (isNaN(date.getTime())) {
            console.warn(`[WARN] Invalid date format: ${dateStr}`);
            continue;
          }
          
          // Use date object directly for Plotly
          plotlyDates.push(date);
          plotlyCloses.push(closeValue);
          
        } catch (error) {
          console.warn(`[WARN] Error parsing date: ${filteredDates[i]}`, error);
          continue;
        }
      }
      
      if (plotlyDates.length === 0 || plotlyCloses.length === 0) {
        console.warn(`[WARN] No valid data for ticker: ${t}`);
        continue;
      }
      
      // Ensure dates and closes arrays have same length
      if (plotlyDates.length !== plotlyCloses.length) {
        console.warn(`[WARN] Date/close length mismatch for ${t}:`, plotlyDates.length, 'vs', plotlyCloses.length);
        continue;
      }
      
      console.log(`[DATA] Valid data points for ${t}:`, plotlyDates.length, 'dates,', plotlyCloses.length, 'closes');
      console.log(`[DATA] Date range for ${t}:`, plotlyDates[0], 'to', plotlyDates[plotlyDates.length - 1]);
      console.log(`[DATA] Sample data for ${t}:`, {
        firstDate: plotlyDates[0],
        firstClose: plotlyCloses[0],
        lastDate: plotlyDates[plotlyDates.length - 1],
        lastClose: plotlyCloses[plotlyCloses.length - 1]
      });
      
      traces.push({
        x: plotlyDates,
        y: plotlyCloses,
        type: "scatter",
        mode: "lines+markers",
        name: t,
        line: { width: 2 }
      });
    }

    console.log(`[TRACE] Created ${traces.length} traces for ${elemId}`);
    
    // Check if we have any traces to render
    if (traces.length === 0) {
      console.warn(`[WARN] No traces to render for ${elemId}`);
      this.updateDebugInfo(`[WARN] No data available for selected tickers`);
      return;
    }

    // Dynamic layout based on date range
    const layout = {
      title: `Market Data - ${selected.join(', ')}${startDate || endDate ? ` (${startDate || 'Start'} to ${endDate || 'End'})` : ''}`,
      margin: { t: 40, r: 10, b: 60, l: 55 },
      xaxis: { 
        title: "Date",
        type: 'date',
        tickformat: '%Y-%m-%d',
        tickangle: -45,
        showgrid: true,
        tickmode: 'auto',
        nticks: 10,
        rangeslider: { visible: false }
      },
      yaxis: { 
        title: "Close Price",
        showgrid: true
      },
      hovermode: 'x unified',
      showlegend: true,
      responsive: true
    };

    try {
      // Check if element exists
      const element = document.getElementById(elemId);
      if (!element) {
        console.error(`[ERROR] Element ${elemId} not found`);
        this.updateDebugInfo(`[ERROR] Element ${elemId} not found`);
        return;
      }
      
      // Check if Plotly is available
      if (typeof Plotly === 'undefined') {
        console.error('[ERROR] Plotly is not available');
        this.updateDebugInfo('[ERROR] Plotly is not available');
        return;
      }
      
      console.log(`[PLOTLY] Rendering ${traces.length} traces to ${elemId}`);
      console.log(`[PLOTLY] First trace data points:`, traces[0]?.x?.length || 0, 'dates,', traces[0]?.y?.length || 0, 'values');
      
      Plotly.newPlot(elemId, traces, layout, { responsive: true });
      console.log(`[SUCCESS] Successfully rendered time series for ${elemId}`);
      this.updateDebugInfo(`[SUCCESS] Successfully rendered time series for ${elemId}`);
    } catch (error) {
      console.error(`[ERROR] Error rendering time series for ${elemId}:`, error);
      this.updateDebugInfo(`[ERROR] Error rendering time series: ${error.message}`);
    }
  }

  /**
   * Handle date range selection change
   */
  handleDateRangeChange() {
    console.log('[DATE] Date range selection changed');
    this.updateDebugInfo('[DATE] Date range selection changed');
    
    const dateRangeSelect = document.getElementById('date_range_select');
    const customDateRange = document.getElementById('custom_date_range');
    
    if (!dateRangeSelect) {
      console.warn('⚠️ Date range select not found');
      return;
    }
    
    // Show/hide custom date inputs
    if (customDateRange) {
      if (dateRangeSelect.value === 'custom') {
        customDateRange.style.display = 'block';
        console.log('[DATE] Custom date range inputs shown');
      } else {
        customDateRange.style.display = 'none';
        console.log('[DATE] Custom date range inputs hidden');
      }
    }
    
    // Auto-update chart if market data is available
    if (this.data.market && this.data.market.length > 0) {
      try {
        console.log('[DATE] Auto-updating chart with new date range...');
        
        // Get selected tickers
        const tickerSelect = document.getElementById('market_ticker_select');
        if (!tickerSelect) {
          console.warn('[WARN] Market ticker select not found');
          return;
        }
        
        const selectedTickers = Array.from(tickerSelect.selectedOptions)
          .map(option => option.value);
        
        if (selectedTickers.length === 0) {
          console.warn('[WARN] No tickers selected for auto-update');
          return;
        }
        
        // Get new date range
        const dateRange = this.getSelectedDateRange();
        
        // Update chart
        const marketData = this.groupMarket(this.data.market);
        this.renderTimeSeries('timeseries', marketData.byTicker, selectedTickers, dateRange.startDate, dateRange.endDate);
        
        console.log('[SUCCESS] Chart auto-updated with new date range');
        this.updateDebugInfo('[SUCCESS] Chart auto-updated with new date range');
      } catch (error) {
        console.error('[ERROR] Error auto-updating chart:', error);
        this.updateDebugInfo('[ERROR] Error auto-updating chart: ' + error.message);
      }
    }
  }

  /**
   * Get selected date range
   */
  getSelectedDateRange() {
    const dateRangeSelect = document.getElementById('date_range_select');
    if (!dateRangeSelect) {
      console.warn('⚠️ Date range select not found');
      return { startDate: null, endDate: null };
    }
    
    const selectedRange = dateRangeSelect.value;
    console.log('[DATE] Selected date range:', selectedRange);
    
    if (selectedRange === 'custom') {
      const startDate = document.getElementById('start_date')?.value;
      const endDate = document.getElementById('end_date')?.value;
      console.log('[DATE] Custom date range:', { startDate, endDate });
      return { startDate, endDate };
    }
    
    if (selectedRange === 'all') {
      console.log('[DATE] All time range selected');
      return { startDate: null, endDate: null };
    }
    
    // Get the actual data range first
    let dataEndDate = new Date();
    if (this.data.market && this.data.market.length > 0) {
      // Find the latest date in the data
      const validDates = this.data.market
        .map(row => {
          try {
            const date = new Date(row.date);
            return isNaN(date.getTime()) ? null : date;
          } catch (error) {
            return null;
          }
        })
        .filter(date => date !== null);
      
      if (validDates.length > 0) {
        dataEndDate = validDates.sort((a, b) => b - a)[0];
        console.log('[DATE] Latest date in data:', dataEndDate.toISOString().split('T')[0]);
      }
    }
    
    let startDate = new Date(dataEndDate);
    
    switch (selectedRange) {
      case '1year':
        startDate.setFullYear(dataEndDate.getFullYear() - 1);
        break;
      case '6months':
        startDate.setMonth(dataEndDate.getMonth() - 6);
        break;
      case '3months':
        startDate.setMonth(dataEndDate.getMonth() - 3);
        break;
      case '1month':
        startDate.setMonth(dataEndDate.getMonth() - 1);
        break;
      default:
        console.warn('[WARN] Unknown date range:', selectedRange);
        return { startDate: null, endDate: null };
    }
    
    const result = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: dataEndDate.toISOString().split('T')[0]
    };
    
    console.log('[DATE] Calculated date range:', result);
    return result;
  }

  /**
   * Set default tickers in select element
   */
  setDefaultTickers(defaultTickers) {
    const tickerSelect = document.getElementById('market_ticker_select');
    if (!tickerSelect) {
      console.warn('[WARN] Market ticker select element not found');
      this.updateDebugInfo('[WARN] Market ticker select element not found');
      return;
    }
    
    if (!defaultTickers || !Array.isArray(defaultTickers) || defaultTickers.length === 0) {
      console.warn('[WARN] No default tickers provided');
      this.updateDebugInfo('[WARN] No default tickers provided');
      return;
    }
    
    try {
      // Wait a bit for options to be populated
      setTimeout(() => {
        // Clear previous selections
        Array.from(tickerSelect.options).forEach(option => {
          option.selected = false;
        });
        
        // Select default tickers
        let selectedCount = 0;
        defaultTickers.forEach(ticker => {
          const option = Array.from(tickerSelect.options).find(opt => opt.value === ticker);
          if (option) {
            option.selected = true;
            selectedCount++;
          }
        });
        
        console.log(`[SELECT] Default tickers set in select element: ${selectedCount}/${defaultTickers.length}`, defaultTickers);
        this.updateDebugInfo(`[SELECT] Default tickers set: ${selectedCount}/${defaultTickers.length} (${defaultTickers.join(', ')})`);
      }, 100);
    } catch (error) {
      console.error('[ERROR] Error setting default tickers:', error);
      this.updateDebugInfo('[ERROR] Error setting default tickers: ' + error.message);
    }
  }

  /**
   * Set default date range based on available data
   */
  setDefaultDateRange() {
    console.log('[DATE] Setting default date range...');
    
    if (!this.data.market || this.data.market.length === 0) {
      console.warn('[WARN] No market data available for setting default date range');
      return;
    }
    
    try {
      // Get all unique dates and sort them
      const dates = this.data.market
        .map(row => row.date)
        .filter(Boolean)
        .map(dateStr => {
          // Parse the date string to get a proper Date object
          const date = new Date(dateStr);
          return isNaN(date.getTime()) ? null : date;
        })
        .filter(date => date !== null);
      
      if (dates.length === 0) {
        console.warn('[WARN] No valid dates found in market data');
        return;
      }
      
      // Sort dates
      dates.sort((a, b) => a - b);
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];
      
      console.log('[DATE] Data date range:', { 
        start: startDate.toISOString().split('T')[0], 
        end: endDate.toISOString().split('T')[0],
        totalDays: dates.length
      });
      
      // Set date inputs for custom range
      const startDateInput = document.getElementById('start_date');
      const endDateInput = document.getElementById('end_date');
      
      if (startDateInput && endDateInput) {
        startDateInput.value = startDate.toISOString().split('T')[0];
        endDateInput.value = endDate.toISOString().split('T')[0];
        console.log('[DATE] Default date inputs set:', startDateInput.value, 'to', endDateInput.value);
      }
      
      // Set default date range select to "All Time"
      const dateRangeSelect = document.getElementById('date_range_select');
      if (dateRangeSelect) {
        dateRangeSelect.value = 'all';
        console.log('[DATE] Default date range select set to "All Time"');
      }
      
      this.updateDebugInfo(`[DATE] Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]} (${dates.length} days)`);
    } catch (error) {
      console.error('[ERROR] Error setting default date range:', error);
      this.updateDebugInfo('[ERROR] Error setting default date range: ' + error.message);
    }
  }

  /**
   * Filter data by date range
   */
  filterDataByDateRange(dates, values, startDate, endDate) {
    console.log('[DATE] Filtering data by date range:', { startDate, endDate, totalDates: dates.length });
    
    if (!startDate && !endDate) {
      console.log('[DATE] No date filtering applied');
      return { dates, closes: values };
    }
    
    const filteredDates = [];
    const filteredValues = [];
    
    // Parse start and end dates with proper timezone handling
    const start = startDate ? new Date(startDate + 'T00:00:00Z') : null;
    const end = endDate ? new Date(endDate + 'T23:59:59Z') : null;
    
    console.log('[DATE] Parsed date range:', { start, end });
    
    for (let i = 0; i < dates.length; i++) {
      try {
        // Parse the date string (handle various formats)
        let currentDate;
        const dateStr = dates[i];
        
        if (dateStr.includes('+08:00') || dateStr.includes('T')) {
          // Handle ISO format with timezone: "2025-02-28 00:00:00+08:00"
          currentDate = new Date(dateStr);
        } else if (dateStr.includes(' ')) {
          // Handle datetime format without timezone
          currentDate = new Date(dateStr);
        } else {
          // Handle date-only format
          currentDate = new Date(dateStr + 'T00:00:00Z');
        }
        
        // Check if date is valid
        if (isNaN(currentDate.getTime())) {
          console.warn('[WARN] Invalid date format:', dateStr);
          continue;
        }
        
        let include = true;
        
        // Compare dates (normalize to UTC for comparison)
        if (start && currentDate < start) {
          include = false;
        }
        
        if (end && currentDate > end) {
          include = false;
        }
        
        if (include) {
          filteredDates.push(dateStr);
          filteredValues.push(values[i]);
        }
      } catch (error) {
        console.warn('[WARN] Error parsing date:', dates[i], error);
      }
    }
    
    console.log(`[DATE] Filtered ${dates.length} dates to ${filteredDates.length} dates`);
    this.updateDebugInfo(`[DATE] Date filtering: ${dates.length} → ${filteredDates.length} dates`);
    
    // If no data after filtering, return original data with warning
    if (filteredDates.length === 0) {
      console.warn('[WARN] No data after filtering, returning original data');
      this.updateDebugInfo('[WARN] No data after filtering, showing all data');
      return { dates, closes: values };
    }
    
    return { dates: filteredDates, closes: filteredValues };
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
    // Note: date_select element doesn't exist in HTML, skipping
    console.log('[INFO] Skipping date_select population - element not found in HTML');
    
    this.updateResultSection();
  }

  updateResultSection() {
    const modelSel = document.getElementById('model_select');
    // Note: date_select element doesn't exist in HTML
    const dateSel = null;
    
    // Check if modelSel exists
    if (!modelSel) {
      console.warn('[WARN] model_select element not found');
      return;
    }
    const models = this.unique(this.data.result.map(r => r.model).filter(Boolean)).sort();
    const dates = this.unique(this.data.result.map(r => r.date).filter(Boolean))
      .sort((a, b) => new Date(a) - new Date(b));

    const mdl = modelSel?.value || models[0];
    const dt = dateSel?.value || dates[dates.length - 1];

    const rows = this.data.result.filter(r => r.model === mdl && r.date === dt);

    // Update metadata
    const info = rows[0] || {};
    const metaEl = document.getElementById('portfolio_meta');
    if (metaEl) {
      metaEl.textContent = `Model: ${mdl} • Date: ${dt} • Market: ${info.market ?? "—"} • Ticker: ${info.ticker ?? "—"} • Pred Len: ${info.pred_len ?? "—"} • Final PV: ${info["Final Portfolio Value"] ?? "—"}`;
    } else {
      console.log('[INFO] portfolio_meta element not found - skipping metadata update');
    }

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
    // Check if portfolio_bars element exists before rendering
    const portfolioBarsElement = document.getElementById("portfolio_bars");
    if (portfolioBarsElement) {
      this.renderPortfolioBars("portfolio_bars", t5, w5, "Weight");
    } else {
      console.log('[INFO] portfolio_bars element not found - skipping portfolio bars render');
    }

    // Portfolio value chart
    const portfolioValueElement = document.getElementById("portfolio_value");
    if (portfolioValueElement) {
      const sameMarket = this.data.result.filter(r => r.market === (rows[0]?.market ?? rows[0]?.market));
      this.renderPortfolioValue("portfolio_value", sameMarket.length ? sameMarket : this.data.result);
    } else {
      console.log('[INFO] portfolio_value element not found - skipping portfolio value render');
    }

    // Recompute performance metrics using current selections
    this.calculatePortfolioMetrics(rows);
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

  renderPortfolioValue(elemId, rows, marketName, startDate = null, endDate = null) {
    // Normalize to starting value = 1 for comparison
    rows = rows.filter(r => r.date && r["Final Portfolio Value"] != null && r.model);
    rows.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (!rows.length) {
      Plotly.purge(elemId);
      return;
    }

    const pvFirst = rows[0]["Final Portfolio Value"];
    const pvTrace = {
      type: 'scatter', mode: 'lines', name: 'Portfolio',
      x: rows.map(r => r.date),
      y: rows.map(r => r["Final Portfolio Value"] / pvFirst),
      line: { width: 3, color: '#2563eb' }
    };

    // Benchmark from test.csv for same market
    let bench = this.data.test
      .filter(t => t.market === marketName && t.date && t.close != null)
      .sort((a,b)=>new Date(a.date)-new Date(b.date));
    if (startDate) bench = bench.filter(b => new Date(b.date) >= new Date(startDate));
    if (endDate) bench = bench.filter(b => new Date(b.date) <= new Date(endDate));
    let benchTrace = null;
    if (bench.length) {
      const bFirst = bench[0].close;
      benchTrace = {
        type: 'scatter', mode: 'lines', name: `${marketName.toUpperCase()} Index`,
        x: bench.map(b => b.date),
        y: bench.map(b => b.close / bFirst),
        line: { width: 2, dash: 'dash', color: '#111827' }
      };
    }

    const traces = benchTrace ? [pvTrace, benchTrace] : [pvTrace];
    const layout = {
      margin: { t: 30, r: 10, b: 50, l: 60 },
      xaxis: { title: 'Date' },
      yaxis: { title: 'Cumulative Return (Normalized to 1.0)' },
      title: `Portfolio vs ${marketName ? marketName.toUpperCase() : 'Index'}`,
      hovermode: 'x unified', showlegend: true
    };
    Plotly.newPlot(elemId, traces, layout, { responsive: true });

    // Update short LLM-like comment
    try {
      const commentEl = document.getElementById('performance_comment');
      const summaryEl = document.getElementById('performance_summary');
      if (commentEl) {
        const endPv = rows[rows.length-1]["Final Portfolio Value"]/rows[0]["Final Portfolio Value"]-1;
        let benchRet = null;
        let bStart = null, bEnd = null;
        if (bench && bench.length) {
          bStart = bench[0].close; bEnd = bench[bench.length-1].close;
          benchRet = bEnd/bStart - 1;
        }
        if (benchRet!=null) {
          const diff = endPv - benchRet;
          commentEl.textContent = diff>=0
            ? `The portfolio outperformed ${marketName.toUpperCase()} by ${ (diff*100).toFixed(2) } percentage points over the selected period.`
            : `The portfolio underperformed ${marketName.toUpperCase()} by ${ Math.abs(diff*100).toFixed(2) } percentage points.`;
        } else {
          commentEl.textContent = `Portfolio cumulative return is ${(endPv*100).toFixed(2)}% over the selected period.`;
        }

        // Build detailed Performance Summary (Portfolio vs Index)
        if (summaryEl) {
          const portfolioReturns = rows.map((v,i,a)=> i>0 ? (a[i]["Final Portfolio Value"]-a[i-1]["Final Portfolio Value"]) / a[i-1]["Final Portfolio Value"] : null).filter(v=>v!=null);
          const avgDaily = this.calcAvgDaily(portfolioReturns);
          const volAnn = this.calcVolAnnual(portfolioReturns);
          const sharpe = volAnn===0?0: (avgDaily*252)/volAnn;
          const mdd = this.calcMaxDrawdown(rows.map(r=>r["Final Portfolio Value"]))
          let idxSummary = { start: '-', end: '-', avg: '-', vol: '-', sharpe: '-', mdd: '-' };
          if (bench && bench.length) {
            const idxReturns = bench.map((v,i,a)=> i>0 ? (a[i].close-a[i-1].close)/a[i-1].close : null).filter(v=>v!=null);
            idxSummary = {
              start: bStart?.toFixed(2),
              end: bEnd?.toFixed(2) + ` (Change: ${(benchRet*100).toFixed(2)}%)`,
              avg: (this.calcAvgDaily(idxReturns)*100).toFixed(2)+"%",
              vol: (this.calcVolAnnual(idxReturns)*100).toFixed(2)+"%",
              sharpe: (this.sharpeFromReturns(idxReturns)).toFixed(2),
              mdd: (this.calcMaxDrawdown(bench.map(b=>b.close))*100).toFixed(2)+"%"
            };
          }
          summaryEl.innerHTML = `
            <div class="summary-card">
              <div class="summary-title">Portfolio Summary</div>
              <div class="summary-row"><strong>Start Value:</strong> 1.00</div>
              <div class="summary-row"><strong>Portfolio Value:</strong> ${(rows[rows.length-1]["Final Portfolio Value"]).toFixed(2)} (Change: ${(endPv*100).toFixed(2)}%)</div>
              <div class="summary-row"><strong>Average Daily Return:</strong> ${(avgDaily*100).toFixed(2)}%</div>
              <div class="summary-row"><strong>Annualized Volatility:</strong> ${(volAnn*100).toFixed(2)}%</div>
              <div class="summary-row"><strong>Sharpe Ratio:</strong> ${sharpe.toFixed(2)}</div>
              <div class="summary-row"><strong>Maximum Drawdown:</strong> ${(mdd*100).toFixed(2)}%</div>
            </div>
            <div class="summary-card">
              <div class="summary-title">Index Summary</div>
              <div class="summary-row"><strong>Start Value (Index):</strong> ${bStart?bStart.toFixed(2):'-'}</div>
              <div class="summary-row"><strong>End Value (Index):</strong> ${idxSummary.end}</div>
              <div class="summary-row"><strong>Average Daily Return (Index):</strong> ${idxSummary.avg}</div>
              <div class="summary-row"><strong>Annualized Volatility (Index):</strong> ${idxSummary.vol}</div>
              <div class="summary-row"><strong>Sharpe Ratio (Index):</strong> ${idxSummary.sharpe}</div>
              <div class="summary-row"><strong>Maximum Drawdown (Index):</strong> ${idxSummary.mdd}</div>
            </div>`;

          // Update KPI tiles at top (CAGR, Sortino, TE, IR, Alpha/Beta/R2)
          const cagr = Math.pow(1+endPv, Math.max(1, 252/Math.max(1, portfolioReturns.length))) - 1;
          const downside = portfolioReturns.filter(r=>r<0);
          const sortino = downside.length ? (avgDaily*252)/(this.calcVolAnnual(downside)) : 0;
          let te = null, ir = null, alpha=null, beta=null, r2=null;
          if (bench && bench.length) {
            const idxReturns = bench.map((v,i,a)=> i>0 ? (a[i].close-a[i-1].close)/a[i-1].close : null).filter(v=>v!=null);
            const slicedPv = portfolioReturns.slice(-idxReturns.length);
            const diff = slicedPv.map((v,i)=> v - idxReturns[i]);
            te = this.calcVolAnnual(diff);
            const annPort = avgDaily*252;
            const annBench = this.calcAvgDaily(idxReturns)*252;
            ir = te===0?0:( (annPort - annBench) / te );
            // OLS beta, alpha, r2
            const meanP = this.calcAvgDaily(slicedPv), meanB = this.calcAvgDaily(idxReturns);
            let cov=0, varB=0; for (let i=0;i<slicedPv.length;i++){ cov += (slicedPv[i]-meanP)*(idxReturns[i]-meanB); varB += Math.pow(idxReturns[i]-meanB,2);} cov/=slicedPv.length; varB/=idxReturns.length;
            beta = varB===0?0: cov/varB; alpha = (meanP - beta*meanB)*252; // approximate annual alpha
            // r2 - coefficient of determination
            const ssRes = slicedPv.reduce((sum, p, i) => {
              const predicted = alpha/252 + beta * idxReturns[i];
              return sum + Math.pow(p - predicted, 2);
            }, 0);
            const ssTot = slicedPv.reduce((sum, p) => sum + Math.pow(p - meanP, 2), 0);
            r2 = ssTot === 0 ? 0 : Math.max(0, Math.min(1, 1 - (ssRes / ssTot)));
          }
          const setText = (id, val) => { const el=document.getElementById(id); if (el) el.textContent = val; };
          setText('cagr', isFinite(cagr)? (cagr*100).toFixed(2)+'%':'-');
          setText('sortino_ratio', isFinite(sortino)? sortino.toFixed(2):'-');
          setText('tracking_error', te!=null? (te*100).toFixed(2)+'%':'-');
          setText('information_ratio', ir!=null? ir.toFixed(2):'-');
          setText('alpha_metric', alpha!=null? (alpha*100).toFixed(2)+'%':'-');
          setText('beta_metric', beta!=null? beta.toFixed(2):'-');
        }
      }
    } catch(_) {}
  }

  // Helpers for performance summary
  // Expose metric helpers as methods on the dashboard instance to avoid scope issues
  calcAvgDaily(returns) { if (!returns?.length) return 0; return returns.reduce((a,b)=>a+b,0)/returns.length; }
  calcVolAnnual(returns) { if (!returns?.length) return 0; const mean = this.calcAvgDaily(returns); const varr = returns.reduce((a,b)=>a+Math.pow(b-mean,2),0)/returns.length; return Math.sqrt(varr)*Math.sqrt(252); }
  calcMaxDrawdown(series) { if (!series?.length) return 0; let peak = series[0]; let maxDD = 0; for (const v of series) { peak = Math.max(peak, v); maxDD = Math.min(maxDD, (v-peak)/peak); } return Math.abs(maxDD); }
  sharpeFromReturns(rets) { const m = this.calcAvgDaily(rets); const v = this.calcVolAnnual(rets); return v===0?0:(m*252)/v; }

  renderIndexSeries(elemId, rows, marketName) {
    console.log(`[INDEX] Starting renderIndexSeries for ${elemId}, market: ${marketName}`);
    console.log(`[INDEX] Data rows count: ${rows ? rows.length : 0}`);
    
    if (!rows || !rows.length) {
      console.warn('[INDEX] No data provided');
      const el = document.getElementById(elemId);
      if (el) el.innerHTML = '<div style="padding:12px;color:#6b7280">No index data available.</div>';
      return;
    }
    
    let data = rows;
    if (marketName) {
      data = rows.filter(r => r.market === marketName);
      console.log(`[INDEX] Filtered data for market ${marketName}: ${data.length} rows`);
    }
    
    data = data.filter(r => r.date && r.close != null);
    console.log(`[INDEX] Valid data after filtering: ${data.length} rows`);
    
    if (data.length === 0) {
      console.warn('[INDEX] No valid data after filtering');
      const el = document.getElementById(elemId);
      if (el) el.innerHTML = '<div style="padding:12px;color:#6b7280">No valid data for selected market.</div>';
      return;
    }
    
    data.sort((a, b) => new Date(a.date) - new Date(b.date));
    console.log(`[INDEX] Data sorted, first date: ${data[0].date}, last date: ${data[data.length-1].date}`);

    const trace = {
      type: "scatter",
      mode: "lines",
      name: marketName || "index",
      x: data.map(r => r.date),
      y: data.map(r => parseFloat(r.close)),
      line: { width: 2, color: '#2563eb' },
      hovertemplate: '<b>%{fullData.name}</b><br>' +
                     'Date: %{x}<br>' +
                     'Close: $%{y:,.2f}<br>' +
                     '<extra></extra>'
    };

    const layout = {
      margin: { t: 40, r: 10, b: 40, l: 50 },
      xaxis: { 
        title: "Date",
        tickformat: "%Y-%m-%d"
      },
      yaxis: { 
        title: "Close Price",
        tickformat: "$,.0f"
      },
      title: `${marketName ? marketName.toUpperCase() : 'Index'} Time Series`,
      showlegend: true
    };

    const el = document.getElementById(elemId);
    if (!el) {
      console.error(`[INDEX] Element ${elemId} not found`);
      return;
    }
    
    console.log(`[INDEX] Rendering chart with ${data.length} data points`);
    Plotly.newPlot(elemId, [trace], layout, { responsive: true }).then(() => {
      console.log(`[INDEX] Chart rendered successfully`);
      setTimeout(() => {
        if (Plotly.Plots?.resize) {
          Plotly.Plots.resize(el);
          console.log(`[INDEX] Chart resized`);
        }
      }, 100);
    }).catch(error => {
      console.error(`[INDEX] Error rendering chart:`, error);
    });
  }

  populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) {
      console.error(`❌ Select element ${selectId} not found`);
      this.updateDebugInfo(`❌ Select element ${selectId} not found`);
      return;
    }
    
    if (!options || !Array.isArray(options) || options.length === 0) {
      console.warn(`⚠️ No options provided for ${selectId}`);
      this.updateDebugInfo(`⚠️ No options provided for ${selectId}`);
      return;
    }
    
    try {
      select.innerHTML = '';
      options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
      });
      console.log(`✅ Populated ${selectId} with ${options.length} options`);
      this.updateDebugInfo(`✅ Populated ${selectId} with ${options.length} options`);
    } catch (error) {
      console.error(`❌ Error populating ${selectId}:`, error);
      this.updateDebugInfo(`❌ Error populating ${selectId}: ${error.message}`);
    }
  }

  /**
   * Set value for a select element
   * @param {string} selectId - Select element ID
   * @param {string} value - Value to set
   */
  setSelectValue(selectId, value) {
    const select = document.getElementById(selectId);
    if (!select) {
      console.warn(`⚠️ Select element ${selectId} not found for setting value`);
      return;
    }
    
    try {
      select.value = value;
      console.log(`✅ Set ${selectId} value to: ${value}`);
    } catch (error) {
      console.error(`❌ Error setting ${selectId} value:`, error);
    }
  }

  /**
   * Get tickers filtered by market
   * @param {string} market - Market identifier (csi300, csi500, csi1000, all)
   * @returns {Array} Array of ticker symbols
   */
  getTickersByMarket(market) {
    if (!this.data.market || !Array.isArray(this.data.market)) {
      console.warn('[MARKET] No market data available');
      return [];
    }

    let filteredData = this.data.market;
    
    if (market !== 'all') {
      // Filter by market using the market column in the data
      filteredData = this.data.market.filter(d => {
        const dataMarket = d.market || '';
        return dataMarket === market;
      });
    }

    const tickers = [...new Set(filteredData.map(d => d.ticker).filter(Boolean))].sort();
    console.log(`[MARKET] Found ${tickers.length} tickers for market: ${market}`, {
      totalData: this.data.market.length,
      filteredData: filteredData.length,
      sampleTickers: tickers.slice(0, 5)
    });
    return tickers;
  }

  /**
   * Update ticker select based on market selection
   * @param {string} marketSelectId - Market select element ID
   * @param {string} tickerSelectId - Ticker select element ID
   */
  updateTickerSelect(marketSelectId, tickerSelectId) {
    const marketSelect = document.getElementById(marketSelectId);
    const tickerSelect = document.getElementById(tickerSelectId);
    
    if (!marketSelect || !tickerSelect) {
      console.warn(`[MARKET] Market or ticker select not found: ${marketSelectId}, ${tickerSelectId}`);
      return;
    }

    const selectedMarket = marketSelect.value;
    const tickers = this.getTickersByMarket(selectedMarket);
    
    // Clear and populate ticker select
    tickerSelect.innerHTML = '';
    tickers.forEach(ticker => {
      const option = document.createElement('option');
      option.value = ticker;
      option.textContent = ticker;
      tickerSelect.appendChild(option);
    });

    // Set default selection
    if (tickers.length > 0) {
      tickerSelect.value = tickers[0];
    }

    console.log(`[MARKET] Updated ${tickerSelectId} with ${tickers.length} tickers for market: ${selectedMarket}`);
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

  updateDebugInfo(message) {
    const debugDiv = document.getElementById('debug-info');
    if (debugDiv) {
      debugDiv.innerHTML += `<div>${new Date().toLocaleTimeString()}: ${message}</div>`;
    }
  }

  /**
   * Test render function
   */
  testRender() {
    console.log('🧪 Testing render...');
    this.updateDebugInfo('🧪 Testing render...');
    
    // Test if data is available
    console.log('📊 Data status:', {
      market: this.data.market?.length || 0,
      marketPast: this.data.marketPast?.length || 0,
      future: this.data.future?.length || 0,
      result: this.data.result?.length || 0,
      test: this.data.test?.length || 0
    });
    
    this.updateDebugInfo(`📊 Data status: market=${this.data.market?.length || 0}, future=${this.data.future?.length || 0}, result=${this.data.result?.length || 0}, test=${this.data.test?.length || 0}`);
    
    // Test if Plotly is available
    if (typeof Plotly !== 'undefined') {
      console.log('✅ Plotly is available');
      this.updateDebugInfo('✅ Plotly is available');
    } else {
      console.error('❌ Plotly is not available');
      this.updateDebugInfo('❌ Plotly is not available');
    }
    
    // Test if elements exist
    const timeseriesDiv = document.getElementById('timeseries');
    if (timeseriesDiv) {
      console.log('✅ Timeseries div exists');
      this.updateDebugInfo('✅ Timeseries div exists');
    } else {
      console.error('❌ Timeseries div not found');
      this.updateDebugInfo('❌ Timeseries div not found');
    }
  }

  /**
   * Force render function
   */
  forceRender() {
    console.log('🚀 Force rendering...');
    this.updateDebugInfo('🚀 Force rendering...');
    
    try {
      // Force render market data
      if (this.data.market && this.data.market.length > 0) {
        try {
          const marketData = this.groupMarket(this.data.market);
          if (marketData.tickers && marketData.tickers.length > 0) {
            const defaultTickers = marketData.tickers.slice(0, 5);
            const dateRange = this.getSelectedDateRange();
            this.renderTimeSeries('timeseries', marketData.byTicker, defaultTickers, dateRange.startDate, dateRange.endDate);
            console.log('✅ Force rendered market data');
            this.updateDebugInfo('✅ Force rendered market data');
          } else {
            console.warn('⚠️ No tickers available for force render');
            this.updateDebugInfo('⚠️ No tickers available for force render');
          }
        } catch (error) {
          console.error('❌ Error force rendering market data:', error);
          this.updateDebugInfo('❌ Error force rendering market data: ' + error.message);
        }
      } else {
        console.warn('⚠️ No market data to force render');
        this.updateDebugInfo('⚠️ No market data to force render');
      }
      
      // Force render future heatmap
      if (this.data.future && this.data.future.length > 0) {
        const futureData = this.buildFutureMatrix(this.data.future);
        this.renderHeatmap('heatmap', futureData);
        console.log('✅ Force rendered future heatmap');
        this.updateDebugInfo('✅ Force rendered future heatmap');
      }
      
      // Force render index series
      if (this.data.test && this.data.test.length > 0) {
        const indexMarkets = this.unique(this.data.test.map(r => r.market).filter(Boolean)).sort();
        const defaultMarket = indexMarkets[0];
        console.log('🔄 Force rendering index series with market:', defaultMarket);
        this.renderIndexSeries('index_series', this.data.test, defaultMarket);
        console.log('✅ Force rendered index series');
        this.updateDebugInfo('✅ Force rendered index series');
      } else {
        console.warn('⚠️ No test data available for force render');
        this.updateDebugInfo('⚠️ No test data available for force render');
      }
      
    } catch (error) {
      console.error('❌ Error in force render:', error);
      this.updateDebugInfo('❌ Error in force render: ' + error.message);
    }
  }

  // Tab Navigation (simplified)
  setupTabNavigation() {
    console.log('🔧 Setting up tab navigation...');
    // Tab navigation is now handled by inline JavaScript in HTML
    console.log('✅ Tab navigation setup complete');
  }

  onTabChange(tabName) {
    console.log('🔄 Tab changed to:', tabName);
    this.updateDebugInfo(`🔄 Tab changed to: ${tabName}`);
    
    switch(tabName) {
      case 'analysis':
        console.log('🔍 Initializing Analysis tab...');
        this.initializeAnalysisTab();
        
        // Also try to render a default chart if ticker is available
        setTimeout(() => {
          const tickerSelect = document.getElementById('tech_ticker_select');
          const indicatorSelect = document.getElementById('indicator_select');
          
          if (tickerSelect && indicatorSelect && tickerSelect.value && indicatorSelect.value) {
            console.log('[TECH] Auto-rendering default technical analysis');
            this.updateTechnicalAnalysis();
          }
        }, 300);
        break;
      case 'portfolio':
        console.log('💼 Initializing Portfolio tab...');
        this.initializePortfolioTab();
        break;
      case 'risk':
        console.log('⚠️ Initializing Risk tab...');
        this.initializeRiskTab();
        break;
      case 'dashboard':
        console.log('📊 Dashboard tab active');
        // Re-render Index Time Series when the tab becomes visible to avoid zero-size plots
        try {
          if (this.data?.test?.length) {
            const idxSel = document.getElementById('index_market_select');
            const mkt = idxSel?.value || (this.unique(this.data.test.map(r=>r.market).filter(Boolean)).sort()[0]);
            this.renderIndexSeries('index_series', this.data.test, mkt);
            const elem = document.getElementById('index_series');
            if (elem && window.Plotly && Plotly.Plots?.resize) {
              Plotly.Plots.resize(elem);
            }
          }
        } catch (e) {
          console.warn('⚠️ Failed to refresh Index Time Series on tab change:', e.message);
        }
        break;
      default:
        console.log('❓ Unknown tab:', tabName);
    }
  }

  // Analysis Tab Methods
  initializeAnalysisTab() {
    console.log('🔍 Initializing Analysis tab...');
    try {
      // Initialize market selects with default values
      this.setSelectValue('tech_market_select', 'csi300');
      this.setSelectValue('candle_market_select', 'csi300');
      this.setSelectValue('volume_market_select', 'csi300');
      this.setSelectValue('correlation_market1_select', 'csi300');
      this.setSelectValue('correlation_market2_select', 'csi500');
      
      // Update ticker selects based on default market selection
      this.updateTickerSelect('tech_market_select', 'tech_ticker_select');
      this.updateTickerSelect('candle_market_select', 'candle_ticker_select');
      this.updateTickerSelect('volume_market_select', 'volume_ticker_select');
      
      // For correlation matrix, populate with all available tickers initially
      const allTickers = this.getTickersByMarket('all');
      this.populateSelect('correlation_tickers', allTickers);
      
      // Set up market change event listeners
      this.setupMarketChangeListeners();
      
      console.log(`✅ Analysis tab initialized with market selection`);
      this.updateDebugInfo(`✅ Analysis tab initialized with market selection`);
      
      // Auto-render default charts for all panels
      setTimeout(() => {
        this.updateTechnicalAnalysis();
        this.updateCandlestickChart();
        this.updateVolumeAnalysis();
        this.updateCorrelationMatrix();
        console.log('[TECH] All Technical Analysis panels rendered with default values');
      }, 500);
      
    } catch (error) {
      console.error('❌ Error initializing Analysis tab:', error);
      this.updateDebugInfo('❌ Error initializing Analysis tab: ' + error.message);
    }
  }

  /**
   * Set up event listeners for market selection changes
   */
  setupMarketChangeListeners() {
    // Technical Indicators market change
    const techMarketSelect = document.getElementById('tech_market_select');
    if (techMarketSelect) {
      techMarketSelect.addEventListener('change', () => {
        this.updateTickerSelect('tech_market_select', 'tech_ticker_select');
      });
    }

    // Candlestick market change
    const candleMarketSelect = document.getElementById('candle_market_select');
    if (candleMarketSelect) {
      candleMarketSelect.addEventListener('change', () => {
        this.updateTickerSelect('candle_market_select', 'candle_ticker_select');
      });
    }

    // Volume Analysis market change
    const volumeMarketSelect = document.getElementById('volume_market_select');
    if (volumeMarketSelect) {
      volumeMarketSelect.addEventListener('change', () => {
        this.updateTickerSelect('volume_market_select', 'volume_ticker_select');
      });
    }

    // Correlation Matrix market changes
    const corrMarket1Select = document.getElementById('correlation_market1_select');
    const corrMarket2Select = document.getElementById('correlation_market2_select');
    
    if (corrMarket1Select) {
      corrMarket1Select.addEventListener('change', () => {
        this.updateCorrelationTickers();
      });
    }
    
    if (corrMarket2Select) {
      corrMarket2Select.addEventListener('change', () => {
        this.updateCorrelationTickers();
      });
    }

    console.log('[MARKET] Market change listeners setup complete');
  }

  /**
   * Update correlation tickers based on selected markets
   */
  updateCorrelationTickers() {
    const market1Select = document.getElementById('correlation_market1_select');
    const market2Select = document.getElementById('correlation_market2_select');
    
    if (!market1Select || !market2Select) return;
    
    const market1 = market1Select.value;
    const market2 = market2Select.value;
    
    // Get tickers from both markets
    const tickers1 = this.getTickersByMarket(market1);
    const tickers2 = this.getTickersByMarket(market2);
    
    // Combine and deduplicate tickers
    const allTickers = [...new Set([...tickers1, ...tickers2])].sort();
    
    // Update correlation tickers select
    this.populateSelect('correlation_tickers', allTickers);
    
    console.log(`[CORR] Updated correlation tickers: ${allTickers.length} total (${tickers1.length} from ${market1}, ${tickers2.length} from ${market2})`);
  }

  /**
   * Log available markets and their ticker counts for debugging
   */
  logAvailableMarkets() {
    if (!this.data.market || !Array.isArray(this.data.market)) {
      console.warn('[MARKET] No market data available for logging');
      return;
    }

    const marketCounts = {};
    this.data.market.forEach(d => {
      const market = d.market || 'unknown';
      marketCounts[market] = (marketCounts[market] || 0) + 1;
    });

    const uniqueMarkets = Object.keys(marketCounts).sort();
    const totalTickers = [...new Set(this.data.market.map(d => d.ticker))].length;

    console.log('[MARKET] Available markets:', {
      markets: uniqueMarkets,
      marketCounts: marketCounts,
      totalTickers: totalTickers,
      totalDataPoints: this.data.market.length
    });

    // Update market selects with available markets
    this.updateMarketSelects(uniqueMarkets);
  }

  /**
   * Update market select elements with available markets
   * @param {Array} availableMarkets - Array of available market identifiers
   */
  updateMarketSelects(availableMarkets) {
    const marketSelects = [
      'tech_market_select',
      'candle_market_select', 
      'volume_market_select',
      'correlation_market1_select',
      'correlation_market2_select',
      'var_market_select',
      'stress_market_select',
      'risk_metrics_market_select'
    ];

    marketSelects.forEach(selectId => {
      const select = document.getElementById(selectId);
      if (!select) return;

      // Clear existing options
      select.innerHTML = '';

      // Add "All Markets" option
      const allOption = document.createElement('option');
      allOption.value = 'all';
      allOption.textContent = 'All Markets';
      select.appendChild(allOption);

      // Add available markets
      availableMarkets.forEach(market => {
        const option = document.createElement('option');
        option.value = market;
        option.textContent = market.toUpperCase();
        select.appendChild(option);
      });

      console.log(`[MARKET] Updated ${selectId} with ${availableMarkets.length + 1} options`);
    });
  }

  updateTechnicalAnalysis() {
    const tickerSelect = document.getElementById('tech_ticker_select');
    const indicatorSelect = document.getElementById('indicator_select');
    
    if (!tickerSelect || !indicatorSelect) {
      console.warn('[TECH] Technical analysis controls not found');
      return;
    }
    
    const ticker = tickerSelect.value;
    const indicator = indicatorSelect.value;
    
    if (!ticker || !indicator) {
      console.warn('[TECH] Missing ticker or indicator selection');
      console.log('[TECH] Available options:', {
        ticker: tickerSelect.options.length,
        indicator: indicatorSelect.options.length
      });
      return;
    }
    
    console.log(`[TECH] Updating technical analysis for ${ticker} with ${indicator}`);
    
    try {
      // Check if TechnicalAnalysis module is available
      if (!this.technicalAnalysis) {
        console.error('[TECH] TechnicalAnalysis module not available');
        return;
      }
      
      // Get indicator data using new TechnicalAnalysis module
      const indicatorData = this.technicalAnalysis.getIndicator(ticker, indicator, {
        period: 20,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9
      });
      
      if (!indicatorData) {
        console.error(`[TECH] Failed to calculate ${indicator} for ${ticker}`);
        return;
      }
      
      // Get ticker data for chart
      const tickerData = this.data.market.filter(d => d.ticker === ticker);
      if (tickerData.length === 0) {
        console.error(`[TECH] No data found for ticker: ${ticker}`);
        return;
      }
      
      const prices = tickerData.map(d => parseFloat(d.close));
      const dates = tickerData.map(d => d.date);
      
      // Create indicators array for chart
      const indicators = [];
      if (indicator === 'macd') {
        indicators.push(
          { name: 'MACD', data: indicatorData.macd, color: '#2563eb' },
          { name: 'Signal', data: indicatorData.signal, color: '#dc2626' },
          { name: 'Histogram', data: indicatorData.histogram, color: '#16a34a', yaxis: 'y2' }
        );
      } else if (indicator === 'bollinger') {
        indicators.push(
          { name: 'Upper Band', data: indicatorData.upper, color: '#dc2626' },
          { name: 'Middle Band', data: indicatorData.middle, color: '#6b7280' },
          { name: 'Lower Band', data: indicatorData.lower, color: '#dc2626' }
        );
      } else {
        indicators.push({
          name: indicator.toUpperCase(),
          data: indicatorData,
          color: '#dc2626'
        });
      }
      
      // Render chart using ChartUtils
      this.chartUtils.createTimeSeriesChart('technical_chart', {
        prices: prices,
        dates: dates
      }, {
        title: `${ticker} - ${indicator.toUpperCase()} Analysis`,
        indicators: indicators,
        height: 400
      });
      
      console.log(`[TECH] Technical analysis chart rendered for ${ticker}`);
    } catch (error) {
      console.error('[TECH] Error in technical analysis:', error);
    }
  }

  updateCandlestickChart() {
    const ticker = document.getElementById('candle_ticker_select')?.value;
    if (!ticker) {
      console.warn('[CANDLE] No ticker selected');
      return;
    }
    
    console.log(`[CANDLE] Updating candlestick chart for ${ticker}`);
    
    try {
      const tickerData = this.data.market.filter(d => d.ticker === ticker);
      if (tickerData.length === 0) {
        console.error(`[CANDLE] No data found for ticker: ${ticker}`);
        return;
      }
      
      // Prepare OHLC data
      const ohlcData = tickerData.map(d => ({
        open: parseFloat(d.open || d.close),
        high: parseFloat(d.high || d.close),
        low: parseFloat(d.low || d.close),
        close: parseFloat(d.close)
      }));
      
      const dates = tickerData.map(d => d.date);
      const volume = tickerData.map(d => parseFloat(d.volume || 0));
      
      // Render candlestick chart using ChartUtils
      this.chartUtils.createCandlestickChart('candlestick_chart', {
        ohlc: ohlcData,
        dates: dates,
        volume: volume
      }, {
        title: `${ticker} - Candlestick Chart`,
        showVolume: true,
        height: 500
      });
      
      console.log(`[CANDLE] Candlestick chart rendered for ${ticker}`);
    } catch (error) {
      console.error('[CANDLE] Error in candlestick chart:', error);
    }
  }

  updateVolumeAnalysis() {
    const tickerSelect = document.getElementById('volume_ticker_select');
    if (!tickerSelect) {
      console.warn('[VOLUME] Volume ticker select not found');
      return;
    }
    
    const ticker = tickerSelect.value;
    if (!ticker) {
      console.warn('[VOLUME] No ticker selected');
      return;
    }
    
    console.log(`[VOLUME] Updating volume analysis for ${ticker}`);
    
    try {
      const tickerData = this.data.market.filter(d => d.ticker === ticker);
      if (tickerData.length === 0) {
        console.error(`[VOLUME] No data found for ticker: ${ticker}`);
        return;
      }
      
      // Prepare volume data
      const dates = tickerData.map(d => d.date);
      const volumes = tickerData.map(d => parseFloat(d.volume || 0));
      const prices = tickerData.map(d => parseFloat(d.close));
      
      // Create volume chart using ChartUtils
      this.chartUtils.createVolumeChart('volume_chart', {
        dates: dates,
        volumes: volumes,
        prices: prices
      }, {
        title: `${ticker} - Volume Analysis`,
        height: 400
      });
      
      console.log(`[VOLUME] Volume analysis chart rendered for ${ticker}`);
    } catch (error) {
      console.error('[VOLUME] Error in volume analysis:', error);
    }
  }

  updateCorrelationMatrix() {
    const correlationSelect = document.getElementById('correlation_tickers');
    if (!correlationSelect) {
      console.warn('[CORR] Correlation tickers select not found');
      return;
    }
    
    let selectedTickers = Array.from(correlationSelect.selectedOptions)
      .map(o => o.value).slice(0, 10);
    
    // If no tickers selected, use first 5 available tickers as default
    if (selectedTickers.length < 2) {
      const allOptions = Array.from(correlationSelect.options);
      selectedTickers = allOptions.slice(0, 5).map(option => option.value);
      console.log('[CORR] Using default tickers for correlation analysis:', selectedTickers);
    }
    
    if (selectedTickers.length < 2) {
      console.warn('[CORR] Need at least 2 tickers for correlation analysis');
      return;
    }
    
    console.log(`[CORR] Updating correlation matrix for ${selectedTickers.length} tickers`);
    
    try {
      // Calculate correlation matrix
      const correlationMatrix = [];
      const returns = [];
      
      // Get returns for each ticker
      for (const ticker of selectedTickers) {
        const tickerData = this.data.market.filter(d => d.ticker === ticker);
        if (tickerData.length === 0) continue;
        
        const prices = tickerData.map(d => parseFloat(d.close));
        const tickerReturns = this.riskManagement.calculateReturns(prices);
        returns.push(tickerReturns);
      }
      
      // Calculate correlation between each pair
      for (let i = 0; i < selectedTickers.length; i++) {
        const row = [];
        for (let j = 0; j < selectedTickers.length; j++) {
          if (i === j) {
            row.push(1.0); // Perfect correlation with itself
          } else {
            const correlation = this.calculateCorrelation(returns[i], returns[j]);
            row.push(correlation);
          }
        }
        correlationMatrix.push(row);
      }
      
      // Render correlation heatmap using ChartUtils
      this.chartUtils.createCorrelationHeatmap('correlation_matrix', correlationMatrix, {
        title: 'Ticker Correlation Matrix',
        tickers: selectedTickers,
        height: 400
      });
      
      console.log(`[CORR] Correlation matrix rendered for ${selectedTickers.length} tickers`);
    } catch (error) {
      console.error('[CORR] Error in correlation matrix:', error);
    }
  }
  
  /**
   * Calculate correlation coefficient between two arrays
   * @param {Array} x - First array
   * @param {Array} y - Second array
   * @returns {number} Correlation coefficient
   */
  calculateCorrelation(x, y) {
    if (!x || !y || x.length !== y.length || x.length === 0) {
      return 0;
    }
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Portfolio Tab Methods
  initializePortfolioTab() {
    console.log('💼 Initializing Portfolio tab...');
    try {
      // Populate market/model/date controls from result.csv
      const markets = this.unique(this.data.result.map(r => r.market).filter(Boolean)).sort();
      this.populateSelect('portfolio_market_select', markets);

      const modelSel = document.getElementById('model_select');
      // Note: date_select element doesn't exist in HTML
      const dateSel = null;
      const marketSel = document.getElementById('portfolio_market_select');

      const models = this.unique(this.data.result.map(r => r.model).filter(Boolean)).sort();
      this.populateSelect('model_select', models);

      // Set defaults: market=kospi, model=itransformer if available
      const marketEl = document.getElementById('portfolio_market_select');
      const modelEl = document.getElementById('model_select');
      if (marketEl) {
        const preferredMarket = markets.includes('kospi') ? 'kospi' : markets[0];
        marketEl.value = preferredMarket;
      }
      if (modelEl) {
        const preferredModel = models.includes('itransformer') ? 'itransformer' : models[0];
        modelEl.value = preferredModel;
      }

      // Set default market to first; set start/end date inputs to market+model range
      const applyMarketDates = () => {
        const mkt = marketSel?.value || (markets.includes('kospi') ? 'kospi' : markets[0]);
        const mdl = (document.getElementById('model_select')||{}).value ||
                    (models.includes('itransformer') ? 'itransformer' : models[0]);
        let rows = this.data.result.filter(r => r.market === mkt && r.model === mdl && r.date);
        if (rows.length === 0) rows = this.data.result.filter(r => r.market === mkt && r.date);
        rows.sort((a, b) => new Date(a.date) - new Date(b.date));
        const start = rows[0]?.date; const end = rows[rows.length - 1]?.date;
        const sEl = document.getElementById('portfolio_start_date');
        const eEl = document.getElementById('portfolio_end_date');
        if (start && end && sEl && eEl) { sEl.value = start.slice(0,10); eEl.value = end.slice(0,10); }
      };
      applyMarketDates();

      // Bind update button to re-render all portfolio views by selections
      const updateBtn = document.getElementById('update_result_btn');
      if (updateBtn) {
        updateBtn.addEventListener('click', () => this.updatePortfolioViews());
      }

      // When market or model changes, reset default period to full available range
      if (marketSel) marketSel.addEventListener('change', () => { applyMarketDates(); });
      if (modelSel) modelSel.addEventListener('change', () => { applyMarketDates(); });

      // Also recalc metrics initially
      this.updatePortfolioViews();
      
      // Render selection-aware features (only panels that exist)
      console.log('🔬 Rendering DeepAries features...');
      this.renderRebalancingTimeline();
      this.renderRebalancingFrequency();
      this.renderMarketConditionDetection();
      
      console.log('✅ Portfolio tab initialized');
    } catch (error) {
      console.error('❌ Error initializing Portfolio tab:', error);
    }
  }

  updatePortfolioViews() {
    try {
      const marketSel = document.getElementById('portfolio_market_select');
      const modelSel = document.getElementById('model_select');
      const sEl = document.getElementById('portfolio_start_date');
      const eEl = document.getElementById('portfolio_end_date');
      const market = marketSel?.value;
      const model = modelSel?.value;
      const start = sEl?.value || null;
      const end = eEl?.value || null;

      // Filter result rows by market/model/date
      let rows = this.data.result.filter(r => r.market === market && r.model === model);
      if (start) rows = rows.filter(r => new Date(r.date) >= new Date(start));
      if (end) rows = rows.filter(r => new Date(r.date) <= new Date(end));

      // Update performance summary & KPI tiles from filtered rows
      if (rows.length) {
        const series = rows
          .filter(r => r.date && r['Final Portfolio Value']!=null)
          .sort((a,b)=>new Date(a.date)-new Date(b.date));
        this.calculatePortfolioMetrics(series);
        this.renderPortfolioValue('portfolio_value', series, market, start, end);
      } else {
        // no data for selection: show dashes
        ['total_return','sharpe_ratio','max_drawdown','volatility'].forEach(id=>{
          const el=document.getElementById(id); if(el) el.textContent='-';
        });
      }

      // Render adaptive rebalancing allocations (paged)
      this.renderAdaptiveRebalancingAllocations(rows, { market, model, start, end });

      // Render latest allocation pie near end date
      this.renderLatestAllocationPie(rows, end || null, model, market);

      // Also update timeline/frequency/market condition panels to reflect selection
      this.renderRebalancingTimeline();
      this.renderRebalancingFrequency();
      this.renderMarketConditionDetection();

      // Brief performance commentary
      try {
        const pv = rows.filter(r=>r['Final Portfolio Value']!=null).sort((a,b)=>new Date(a.date)-new Date(b.date));
        if (pv.length) {
          const pvRet = pv[pv.length-1]['Final Portfolio Value']/pv[0]['Final Portfolio Value']-1;
          const bench = this.data.test.filter(t=>t.market===market && t.date).sort((a,b)=>new Date(a.date)-new Date(b.date));
          const bStart = bench.find(b=>!start || new Date(b.date)>=new Date(start));
          const bEnd = [...bench].reverse().find(b=>!end || new Date(b.date)<=new Date(end));
          let benchRet = null;
          if (bStart && bEnd) benchRet = bEnd.close/bStart.close - 1;
          const meta = document.getElementById('portfolio_meta');
          if (meta) {
            const diff = benchRet!=null ? (pvRet-benchRet) : null;
            meta.textContent = benchRet!=null
              ? `Performance: Portfolio ${ (pvRet*100).toFixed(2) }% vs ${market.toUpperCase()} Index ${ (benchRet*100).toFixed(2) }% (${ diff>=0? 'Outperformed':'Underperformed' } by ${Math.abs(diff*100).toFixed(2)} pp)`
              : `Performance: Portfolio ${ (pvRet*100).toFixed(2) }% (benchmark unavailable)`;
          }
        }
      } catch(_) {}
    } catch (e) {
      console.error('❌ updatePortfolioViews failed:', e);
    }
  }

  renderAdaptiveRebalancingAllocations(rows, context={}) {
    if (!rows || rows.length === 0) return;

    // Sort by date and identify distinct rebalance days within selected period
    const sorted = [...rows].sort((a,b)=>new Date(a.date)-new Date(b.date));
    const pageEvents = sorted.filter((r, idx, arr) => idx===0 || r.date !== arr[idx-1].date);

    // Build the set of symbols that appear in top-5 at any rebalance date
    const allSymbolsSet = new Set();
    pageEvents.forEach(row => {
      const pr = this.sanitizePortfolioString(row.portfolio_ratio);
      if (!pr || !pr.all) return;
      Object.entries(pr.all)
        .sort((a,b)=>b[1]-a[1])
        .slice(0,5)
        .forEach(([t])=> allSymbolsSet.add(t));
    });
    const allSymbols = Array.from(allSymbolsSet);

    // Create one stacked-bar trace per symbol across all rebalance dates (all events used)
    const dates = pageEvents.map(e=>e.date);
    const traces = allSymbols.map(sym => {
      const y = dates.map((d, idx) => {
        const pr = this.sanitizePortfolioString(pageEvents[idx].portfolio_ratio);
        if (!pr || !pr.all) return 0;
        // weight only if symbol is within top-5 for that date
        const top = Object.entries(pr.all).sort((a,b)=>b[1]-a[1]).slice(0,5);
        const w = top.find(([t])=>t===sym)?.[1] || 0;
        return w;
      });
      return {
        type:'bar',
        name: sym,
        x: dates,
        y: y,
        hovertemplate: `${sym}<br>Weight: %{y:.1%}<br>Date: %{x}<extra></extra>`
      };
    });

    // Build monthly first-trading-day tick labels (use first event found each month)
    const monthlyTicks = [];
    const monthlyText = [];
    const seenMonth = new Set();
    for (const d of dates) {
      const dt = new Date(d);
      const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
      if (!seenMonth.has(key)) {
        seenMonth.add(key);
        monthlyTicks.push(d);
        monthlyText.push(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-01`);
      }
    }

    const layout = {
      barmode: 'stack',
      title: `Adaptive Rebalancing Allocation (${context.market||''} • ${context.model||''})`,
      xaxis: { title: 'Rebalancing Date (Investment Time)', tickvals: monthlyTicks, ticktext: monthlyText },
      yaxis: { title: 'Investment Ratio of Top-5 Stocks', range: [0,1] },
      margin: { t: 40, r: 10, b: 60, l: 60 },
      showlegend: true
    };

    // Split the full period into 6‑month windows and render multiple stacked charts vertically
    const container = document.getElementById('rebalancing_allocations');
    if (!container) return;
    container.innerHTML = '';

    // Build 6‑month windows
    const allDates = dates.map(d=>new Date(d));
    const startDate = allDates[0];
    const endDate = allDates[allDates.length-1];

    const windows = [];
    let wStart = new Date(startDate);
    while (wStart <= endDate) {
      const wEnd = new Date(wStart); wEnd.setMonth(wEnd.getMonth()+6);
      windows.push({ start: new Date(wStart), end: new Date(wEnd) });
      wStart = new Date(wEnd);
    }

    // For each window render a stacked chart showing only events within window
    windows.forEach((win, idx) => {
      const winIdx = dates
        .map((d,i)=>({i, date:new Date(d)}))
        .filter(o=> o.date >= win.start && o.date < win.end)
        .map(o=>o.i);
      if (winIdx.length === 0) return;

      const winDates = winIdx.map(i=>dates[i]);
      // Fixed bar width across all windows. Assume worst case daily rebalancing in 6 months
      const dayMs = 24*60*60*1000;
      const barWidthMs = Math.floor(dayMs * 0.7); // 70% of a day width
      const winTraces = allSymbols.map(sym => ({
        type:'bar',
        name:sym,
        x: winDates,
        y: winIdx.map(i=> traces.find(t=>t.name===sym).y[i] || 0),
        width: new Array(winDates.length).fill(barWidthMs),
        hovertemplate: `${sym}<br>Weight: %{y:.1%}<br>Date: %{x}<extra></extra>`
      }));

      const wLayout = {
        barmode:'stack',
        title: `Adaptive Rebalancing Allocation (${context.market||''} • ${context.model||''}) — ${win.start.toISOString().slice(0,7)} ~ ${win.end.toISOString().slice(0,7)}`,
        xaxis:{ title:'Rebalancing Date (Investment Time)', type:'date', tickmode:'array', tickvals: (()=>{
          const tVals=[]; const seen=new Set();
          winDates.forEach(d=>{ const dt=new Date(d); const key=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`; if(!seen.has(key)){seen.add(key); tVals.push(d);} });
          return tVals;
        })(), ticktext: (()=>{
          const tText=[]; const seen=new Set();
          winDates.forEach(d=>{ const dt=new Date(d); const key=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`; if(!seen.has(key)){seen.add(key); tText.push(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-01`);} });
          return tText;
        })(), range:[win.start, win.end] },
        yaxis:{ title:'Investment Ratio of Top-5 Stocks', range:[0,1] },
        margin:{ t:40, r:10, b:60, l:60 }, showlegend: idx===0
      };

      const div = document.createElement('div');
      div.style.marginBottom = '24px';
      container.appendChild(div);
      Plotly.newPlot(div, winTraces, wLayout, { responsive:true });
    });
    // No pagination or frequency controls (single chart)
  }

  /**
   * Render pie chart for allocation closest to the selected end date
   */
  renderLatestAllocationPie(rows, endDate, model, market) {
    try {
      if (!rows || rows.length === 0) return;
      const end = endDate ? new Date(endDate) : new Date(rows[rows.length - 1].date);
      const withDates = rows.filter(r => r.date && r.portfolio_ratio).sort((a,b)=>new Date(a.date)-new Date(b.date));
      if (!withDates.length) return;

      // Find closest rebalancing record on or before end date; fallback to nearest
      let chosen = null; let minDiff = Infinity;
      for (const r of withDates) {
        const d = new Date(r.date);
        const diff = Math.abs(d - end);
        if (d <= end && diff < minDiff) { chosen = r; minDiff = diff; }
      }
      if (!chosen) chosen = withDates[withDates.length - 1];

      // Parse allocation map
      const pr = this.sanitizePortfolioString(chosen.portfolio_ratio) || { all: {} };
      const alloc = pr.all || {};
      const labels = Object.keys(alloc).length ? Object.keys(alloc) : ['—'];
      const values = Object.keys(alloc).length ? labels.map(k => alloc[k]) : [1];

      // Other bucket if too many assets; show top 6 + Others
      const sorted = labels.map(k => ({k, v: alloc[k]})).sort((a,b)=>b.v-a.v);
      const top = sorted.slice(0,6);
      const others = sorted.slice(6).reduce((s,x)=>s+x.v,0);
      const pieLabels = top.map(x=>x.k).concat(others>0?['Others']:[]);
      const pieValues = top.map(x=>x.v).concat(others>0?[others]:[]);

      const pie = [{ type: 'pie', labels: pieLabels, values: pieValues, textinfo: 'label+percent', hole: 0 }];
      const layout = { title: '', margin: { t: 10, r: 10, b: 10, l: 10 } };
      this.createChartContainer('allocation_pie');
      Plotly.newPlot('allocation_pie', pie, layout, { responsive: true });

      // Title and next rebalancing recommendation
      const titleEl = document.getElementById('allocation_title');
      if (titleEl) titleEl.textContent = `Allocation on ${chosen.date} — Model: ${model}`;

      const noteEl = document.getElementById('next_rebalancing_note');
      // Prefer model's predicted holding period (pred_len) if available for the chosen record
      const recDays = Number.isFinite(Number(chosen.pred_len)) && Number(chosen.pred_len) > 0
        ? Math.round(Number(chosen.pred_len))
        : this.estimateNextRebalancingDays(rows, chosen.date);
      if (noteEl) noteEl.textContent = `Next Rebalancing Recommendation: Hold this portfolio for ${recDays} days`;
    } catch (e) {
      console.warn('[WARN] renderLatestAllocationPie failed:', e.message);
    }
  }

  /** Estimate days until next rebalancing from the event list */
  estimateNextRebalancingDays(rows, fromDate) {
    const sorted = rows.filter(r=>r.date).sort((a,b)=>new Date(a.date)-new Date(b.date));
    const idx = sorted.findIndex(r => r.date === fromDate);
    if (idx >= 0 && idx < sorted.length - 1) {
      const d1 = new Date(sorted[idx].date);
      const d2 = new Date(sorted[idx+1].date);
      return Math.max(1, Math.round((d2 - d1)/(1000*60*60*24)));
    }
    // Fallback: median gap
    const gaps = [];
    for (let i=1;i<sorted.length;i++) gaps.push((new Date(sorted[i].date)-new Date(sorted[i-1].date))/(1000*60*60*24));
    if (gaps.length) {
      gaps.sort((a,b)=>a-b); return Math.max(1, Math.round(gaps[Math.floor(gaps.length/2)]));
    }
    return 5;
  }

  /**
   * Compute performance summary metrics from result.csv for current model/market
   * - Total Return, Sharpe Ratio, Max Drawdown, Volatility
   */
  calculatePortfolioMetrics(filteredRows = null) {
    if (!this.data?.result || this.data.result.length === 0) return;

    // Use filteredRows (current selections) if provided
    let series = (filteredRows || [])
      .filter(r => r.date && r["Final Portfolio Value"] != null)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    if (series.length < 2) return;

    const values = series.map(s => Number(s["Final Portfolio Value"]))
      .filter(v => Number.isFinite(v));
    const totalReturn = values[values.length - 1] / values[0] - 1;

    // Daily returns from portfolio value series
    const rets = [];
    for (let i = 1; i < values.length; i++) {
      const r = (values[i] - values[i - 1]) / values[i - 1];
      if (Number.isFinite(r)) rets.push(r);
    }
    if (rets.length === 0) return;

    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rets.length;
    const volDaily = Math.sqrt(variance);
    const volAnnual = volDaily * Math.sqrt(252);
    const sharpe = volDaily === 0 ? 0 : (mean * 252) / volAnnual; // risk-free ~ 0

    // Max drawdown
    let peak = values[0];
    let maxDD = 0;
    for (const v of values) {
      peak = Math.max(peak, v);
      const dd = (v - peak) / peak;
      if (dd < maxDD) maxDD = dd;
    }

    // Update UI
    const fmtPct = v => `${(v * 100).toFixed(2)}%`;
    const fmtNum = v => (Number.isFinite(v) ? v.toFixed(3) : '-')
    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    setText('total_return', fmtPct(totalReturn));
    setText('sharpe_ratio', fmtNum(sharpe));
    setText('max_drawdown', fmtPct(maxDD));
    setText('volatility', fmtPct(volAnnual));
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

  

  // Risk Tab Methods
  initializeRiskTab() {
    console.log('⚠️ Initializing Risk tab...');
    try {
      // Set up market change event listeners for risk management
      this.setupRiskMarketChangeListeners();
      
      // Market selects will be populated by updateMarketSelects() called from logAvailableMarkets()
      // Set default values after markets are available
      setTimeout(() => {
        const availableMarkets = this.getAvailableMarketsFromData();
        if (availableMarkets.length > 0) {
          // Set default market to first available market
          const defaultMarket = availableMarkets[0];
          this.setSelectValue('var_market_select', defaultMarket);
          this.setSelectValue('stress_market_select', defaultMarket);
          this.setSelectValue('risk_metrics_market_select', defaultMarket);
          
          // Update ticker selects based on default market selection
          this.updateTickerSelect('var_market_select', 'var_ticker_select');
          this.updateTickerSelect('stress_market_select', 'stress_ticker_select');
          this.updateTickerSelect('risk_metrics_market_select', 'risk_metrics_ticker_select');
          
          // Auto-render default risk analysis
          setTimeout(() => {
            this.calculateVaR();
            this.runStressTest();
            this.calculateRiskMetrics();
            console.log('[RISK] All Risk Management panels rendered with default values');
          }, 200);
        }
      }, 100);
      
      console.log(`✅ Risk tab initialized with market selection`);
      this.updateDebugInfo(`✅ Risk tab initialized with market selection`);
      
    } catch (error) {
      console.error('❌ Error initializing Risk tab:', error);
      this.updateDebugInfo('❌ Error initializing Risk tab: ' + error.message);
    }
  }

  /**
   * Get available markets from current data
   * @returns {Array} Array of available market identifiers
   */
  getAvailableMarketsFromData() {
    if (!this.data.market || !Array.isArray(this.data.market)) {
      return [];
    }

    const marketCounts = {};
    this.data.market.forEach(d => {
      const market = d.market || 'unknown';
      marketCounts[market] = (marketCounts[market] || 0) + 1;
    });

    return Object.keys(marketCounts).sort();
  }

  /**
   * Set up event listeners for risk management market selection changes
   */
  setupRiskMarketChangeListeners() {
    // VaR market change
    const varMarketSelect = document.getElementById('var_market_select');
    if (varMarketSelect) {
      varMarketSelect.addEventListener('change', () => {
        this.updateTickerSelect('var_market_select', 'var_ticker_select');
      });
    }

    // Stress test market change
    const stressMarketSelect = document.getElementById('stress_market_select');
    if (stressMarketSelect) {
      stressMarketSelect.addEventListener('change', () => {
        this.updateTickerSelect('stress_market_select', 'stress_ticker_select');
      });
    }

    // Risk metrics market change
    const riskMetricsMarketSelect = document.getElementById('risk_metrics_market_select');
    if (riskMetricsMarketSelect) {
      riskMetricsMarketSelect.addEventListener('change', () => {
        this.updateTickerSelect('risk_metrics_market_select', 'risk_metrics_ticker_select');
      });
    }

    console.log('[RISK] Risk management market change listeners setup complete');
  }

  calculateVaR() {
    const confidenceSelect = document.getElementById('var_confidence');
    const horizonSelect = document.getElementById('var_horizon');
    const tickerSelect = document.getElementById('var_ticker_select');
    
    if (!confidenceSelect || !horizonSelect || !tickerSelect) {
      console.warn('[VAR] VaR controls not found');
      return;
    }
    
    const confidence = parseFloat(confidenceSelect.value);
    const horizon = parseInt(horizonSelect.value);
    const ticker = tickerSelect.value;
    
    if (!ticker) {
      console.warn('[VAR] No ticker selected for VaR calculation');
      return;
    }
    
    console.log(`[VAR] Calculating VaR for ${ticker} with ${(confidence * 100).toFixed(0)}% confidence over ${horizon} days`);
    
    try {
      
      // Calculate VaR using actual data
      const tickerData = this.data.market.filter(d => d.ticker === ticker);
      if (tickerData.length === 0) {
        console.error(`[VAR] No data found for ticker: ${ticker}`);
        return;
      }
      
      const prices = tickerData.map(d => parseFloat(d.close));
      const returns = this.calculateReturns(prices);
      
      // Calculate VaR using historical method with time horizon scaling
      const varResult = this.calculateHistoricalVaR(returns, confidence, horizon);
      const expectedShortfall = this.calculateExpectedShortfall(returns, confidence, horizon);
      
      // Update UI with VaR results
      const varValueEl = document.getElementById('var_value');
      const expectedShortfallEl = document.getElementById('expected_shortfall');
      
      if (varValueEl) {
        varValueEl.textContent = `${(varResult * 100).toFixed(2)}%`;
      }
      
      if (expectedShortfallEl) {
        expectedShortfallEl.textContent = `${(expectedShortfall * 100).toFixed(2)}%`;
      }
      
      // Render VaR distribution chart
      this.chartUtils.createVaRChart('var_chart', returns, {
        title: `${ticker} - VaR Distribution (${(confidence * 100).toFixed(0)}% Confidence)`,
        confidenceLevel: confidence,
        height: 400
      });
      
      console.log(`[VAR] VaR calculation completed: ${(varResult * 100).toFixed(2)}%`);
    } catch (error) {
      console.error('[VAR] Error in VaR calculation:', error);
    }
  }

  runStressTest() {
    const scenarioSelect = document.getElementById('stress_scenario');
    const tickerSelect = document.getElementById('stress_ticker_select');
    
    if (!scenarioSelect || !tickerSelect) {
      console.warn('[STRESS] Stress test controls not found');
      return;
    }
    
    const scenario = scenarioSelect.value;
    const ticker = tickerSelect.value;
    
    if (!ticker) {
      console.warn('[STRESS] No ticker selected for stress test');
      return;
    }
    
    console.log(`[STRESS] Running stress test for ${ticker} with scenario: ${scenario}`);
    
    try {
      const tickerData = this.data.market.filter(d => d.ticker === ticker);
      
      if (tickerData.length === 0) {
        console.error(`[STRESS] No data found for ticker: ${ticker}`);
        return;
      }
      
      const prices = tickerData.map(d => parseFloat(d.close));
      const returns = this.calculateReturns(prices);
      
      // Run stress test scenarios using actual data
      const stressResults = this.runStressTestScenario(returns, scenario);
      
      // Render stress test results
      this.renderStressTestResults('stress_test_chart', stressResults, scenario, ticker);
      
      console.log(`[STRESS] Stress test completed for ${scenario} scenario`);
    } catch (error) {
      console.error('[STRESS] Error in stress test:', error);
    }
  }
  
  /**
   * Get stress shock value for scenario
   * @param {string} scenario - Stress scenario name
   * @returns {number} Shock value
   */
  getStressShock(scenario) {
    const shocks = {
      market_crash: -0.20,    // 20% market decline
      recession: -0.15,      // 15% market decline
      volatility_spike: 0.30, // 30% volatility increase
      custom: -0.10          // 10% custom scenario
    };
    
    return shocks[scenario] || -0.10;
  }
  
  /**
   * Render stress test results
   * @param {string} containerId - Chart container ID
   * @param {Object} results - Stress test results
   * @param {string} scenario - Scenario name
   * @param {string} ticker - Ticker symbol
   */
  renderStressTestResults(containerId, results, scenario, ticker) {
    const element = document.getElementById(containerId);
    if (!element) {
      console.error(`[STRESS] Container ${containerId} not found`);
      return;
    }
    
    const scenarioResult = results[scenario];
    if (!scenarioResult) {
      console.error(`[STRESS] No results for scenario: ${scenario}`);
      return;
    }
    
    // Create traces for original and stressed returns
    const traces = [
      {
        x: scenarioResult.stressedReturns,
        type: 'histogram',
        name: 'Stressed Returns',
        marker: { color: '#dc2626', opacity: 0.7 },
        nbinsx: 30
      }
    ];
    
    const layout = {
      title: {
        text: `${ticker} - ${scenario.replace('_', ' ').toUpperCase()} Stress Test`,
        font: { size: 16 }
      },
      xaxis: {
        title: 'Returns',
        tickformat: '.2%'
      },
      yaxis: {
        title: 'Frequency'
      },
      height: 400,
      margin: { t: 40, r: 10, b: 40, l: 50 },
      showlegend: true
    };
    
    Plotly.newPlot(containerId, traces, layout, { responsive: true });
    console.log(`[STRESS] Stress test chart rendered for ${scenario}`);
  }

  /**
   * Calculate comprehensive risk metrics for selected ticker
   */
  calculateRiskMetrics() {
    const tickerSelect = document.getElementById('risk_metrics_ticker_select');
    if (!tickerSelect) {
      console.warn('[RISK_METRICS] Risk metrics ticker select not found');
      return;
    }
    
    const ticker = tickerSelect.value;
    if (!ticker) {
      console.warn('[RISK_METRICS] No ticker selected for risk metrics calculation');
      return;
    }
    
    console.log(`[RISK_METRICS] Calculating risk metrics for ${ticker}`);
    
    try {
      const tickerData = this.data.market.filter(d => d.ticker === ticker);
      if (tickerData.length === 0) {
        console.error(`[RISK_METRICS] No data found for ticker: ${ticker}`);
        return;
      }
      
      const prices = tickerData.map(d => parseFloat(d.close));
      const returns = this.calculateReturns(prices);
      
      // Calculate risk metrics
      const volatility = this.calculateVolatility(returns);
      const sharpeRatio = this.calculateSharpeRatio(returns);
      const maxDrawdown = this.calculateMaxDrawdown(prices);
      const beta = this.calculateBeta(returns);
      
      // Update UI with risk metrics
      this.updateRiskMetric('volatility', volatility);
      this.updateRiskMetric('sharpe_ratio', sharpeRatio);
      this.updateRiskMetric('max_drawdown', maxDrawdown);
      this.updateRiskMetric('beta', beta);
      
      // Render risk metrics chart
      this.renderRiskMetricsChart('risk_metrics_chart', {
        ticker: ticker,
        volatility: volatility,
        sharpeRatio: sharpeRatio,
        maxDrawdown: maxDrawdown,
        beta: beta,
        returns: returns
      });
      
      console.log(`[RISK_METRICS] Risk metrics calculated for ${ticker}`);
    } catch (error) {
      console.error('[RISK_METRICS] Error in risk metrics calculation:', error);
    }
  }

  /**
   * Update risk metric display
   * @param {string} metricId - Metric element ID
   * @param {number} value - Metric value
   */
  updateRiskMetric(metricId, value) {
    const element = document.getElementById(metricId);
    if (element) {
      if (metricId === 'volatility' || metricId === 'max_drawdown') {
        element.textContent = `${(value * 100).toFixed(2)}%`;
      } else {
        element.textContent = value.toFixed(3);
      }
    }
  }

  /**
   * Calculate volatility (standard deviation of returns)
   * @param {Array} returns - Array of returns
   * @returns {number} Volatility
   */
  calculateVolatility(returns) {
    if (!returns || returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate Sharpe ratio
   * @param {Array} returns - Array of returns
   * @param {number} riskFreeRate - Risk-free rate (default: 0.02)
   * @returns {number} Sharpe ratio
   */
  calculateSharpeRatio(returns, riskFreeRate = 0.02) {
    if (!returns || returns.length === 0) return 0;
    
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = this.calculateVolatility(returns);
    
    return volatility === 0 ? 0 : (meanReturn - riskFreeRate / 252) / volatility;
  }

  /**
   * Calculate maximum drawdown
   * @param {Array} prices - Array of prices
   * @returns {number} Maximum drawdown
   */
  calculateMaxDrawdown(prices) {
    if (!prices || prices.length === 0) return 0;
    
    let maxPrice = prices[0];
    let maxDrawdown = 0;
    
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > maxPrice) {
        maxPrice = prices[i];
      } else {
        const drawdown = (maxPrice - prices[i]) / maxPrice;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }
    
    return maxDrawdown;
  }

  /**
   * Calculate beta (simplified - would need market returns in real implementation)
   * @param {Array} returns - Array of returns
   * @returns {number} Beta
   */
  calculateBeta(returns) {
    // Simplified beta calculation - in real implementation, you'd compare with market returns
    const volatility = this.calculateVolatility(returns);
    return Math.min(volatility * 10, 2.0); // Simplified approximation
  }

  /**
   * Render risk metrics chart
   * @param {string} containerId - Chart container ID
   * @param {Object} data - Risk metrics data
   */
  renderRiskMetricsChart(containerId, data) {
    const element = document.getElementById(containerId);
    if (!element) {
      console.error(`[RISK_METRICS] Container ${containerId} not found`);
      return;
    }
    
    // Create a simple bar chart of risk metrics
    const traces = [
      {
        x: ['Volatility', 'Sharpe Ratio', 'Max Drawdown', 'Beta'],
        y: [data.volatility * 100, data.sharpeRatio, data.maxDrawdown * 100, data.beta],
        type: 'bar',
        marker: { color: ['#dc2626', '#16a34a', '#dc2626', '#2563eb'] }
      }
    ];
    
    const layout = {
      title: {
        text: `${data.ticker} - Risk Metrics`,
        font: { size: 16 }
      },
      xaxis: { title: 'Metrics' },
      yaxis: { title: 'Value' },
      height: 400,
      margin: { t: 40, r: 10, b: 40, l: 50 }
    };
    
    Plotly.newPlot(containerId, traces, layout, { responsive: true });
    console.log(`[RISK_METRICS] Risk metrics chart rendered for ${data.ticker}`);
  }

  /**
   * Calculate daily returns from price data
   * @param {Array} prices - Array of prices
   * @returns {Array} Array of daily returns
   */
  calculateReturns(prices) {
    if (!prices || prices.length < 2) return [];
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const returnValue = (prices[i] - prices[i-1]) / prices[i-1];
      returns.push(returnValue);
    }
    return returns;
  }

  /**
   * Calculate Historical VaR
   * @param {Array} returns - Array of returns
   * @param {number} confidenceLevel - Confidence level (e.g., 0.95 for 95%)
   * @param {number} timeHorizon - Time horizon in days (default: 1)
   * @returns {number} VaR value
   */
  calculateHistoricalVaR(returns, confidenceLevel, timeHorizon = 1) {
    if (!returns || returns.length === 0) return 0;
    
    // Sort returns in ascending order
    const sortedReturns = [...returns].sort((a, b) => a - b);
    
    // Calculate the index for the confidence level
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    
    // Get the VaR for daily returns
    const dailyVaR = Math.abs(sortedReturns[index]);
    
    // Scale VaR for the time horizon using square root of time rule
    const scaledVaR = dailyVaR * Math.sqrt(timeHorizon);
    
    return scaledVaR;
  }

  /**
   * Calculate Expected Shortfall (Conditional VaR)
   * @param {Array} returns - Array of returns
   * @param {number} confidenceLevel - Confidence level (e.g., 0.95 for 95%)
   * @param {number} timeHorizon - Time horizon in days (default: 1)
   * @returns {number} Expected Shortfall value
   */
  calculateExpectedShortfall(returns, confidenceLevel, timeHorizon = 1) {
    if (!returns || returns.length === 0) return 0;
    
    // Sort returns in ascending order
    const sortedReturns = [...returns].sort((a, b) => a - b);
    
    // Calculate the number of observations in the tail
    const tailSize = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    
    if (tailSize === 0) return 0;
    
    // Calculate the average of the worst returns
    const tailReturns = sortedReturns.slice(0, tailSize);
    const averageTailReturn = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
    
    // Get the Expected Shortfall for daily returns
    const dailyES = Math.abs(averageTailReturn);
    
    // Scale Expected Shortfall for the time horizon using square root of time rule
    const scaledES = dailyES * Math.sqrt(timeHorizon);
    
    return scaledES;
  }

  /**
   * Run stress test scenario on returns data
   * @param {Array} returns - Array of returns
   * @param {string} scenario - Stress test scenario
   * @returns {Object} Stress test results
   */
  runStressTestScenario(returns, scenario) {
    if (!returns || returns.length === 0) {
      return { stressedReturns: [], originalReturns: returns };
    }

    const shock = this.getStressShock(scenario);
    let stressedReturns;

    switch (scenario) {
      case 'market_crash':
      case 'recession':
        // Apply negative shock to all returns
        stressedReturns = returns.map(r => r + shock);
        break;
      case 'volatility_spike':
        // Increase volatility by scaling returns
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const scaledReturns = returns.map(r => (r - meanReturn) * (1 + shock) + meanReturn);
        stressedReturns = scaledReturns;
        break;
      case 'custom':
        // Apply custom shock
        stressedReturns = returns.map(r => r + shock);
        break;
      default:
        stressedReturns = returns;
    }

    return {
      originalReturns: returns,
      stressedReturns: stressedReturns,
      shock: shock,
      scenario: scenario
    };
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


  // Utility Methods
  exportData(data, filename) {
    this.advancedFeatures.exportToCSV(data, filename);
  }

  openFullscreen(chartId) {
    try {
      console.log('[FULLSCREEN] Opening fullscreen for:', chartId);
      
      // Create fullscreen modal
      const modal = document.createElement('div');
      modal.className = 'fullscreen-modal active';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      modal.innerHTML = `
        <div class="fullscreen-content" style="width: 95%; height: 95%; position: relative;">
          <button class="close-fullscreen" style="position: absolute; top: 10px; right: 10px; background: #ff4444; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 20px; cursor: pointer; z-index: 10001;">&times;</button>
          <div id="fullscreen-${chartId}" style="width: 100%; height: 100%;"></div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Re-render chart in fullscreen
      const fullscreenChart = document.getElementById(`fullscreen-${chartId}`);
      
      if (chartId === 'heatmap' && this.data.future && this.data.future.length > 0) {
        // Re-render heatmap in fullscreen
        const futureData = this.buildFutureMatrix(this.data.future);
        this.renderHeatmap(`fullscreen-${chartId}`, futureData);
        console.log('[SUCCESS] Heatmap rendered in fullscreen');
      } else {
        console.warn('[WARN] No data available for fullscreen chart:', chartId);
      }
      
      // Close modal
      modal.querySelector('.close-fullscreen').addEventListener('click', () => {
        document.body.removeChild(modal);
        console.log('[FULLSCREEN] Closed fullscreen modal');
      });
      
      // Close on escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          document.body.removeChild(modal);
          document.removeEventListener('keydown', handleEscape);
          console.log('[FULLSCREEN] Closed fullscreen modal via escape key');
        }
      };
      document.addEventListener('keydown', handleEscape);
      
    } catch (error) {
      console.error('[ERROR] Error opening fullscreen:', error);
    }
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

  // ===== Phase 1: DeepAries Core Features =====

  /**
   * Render rebalancing timeline showing when rebalancing events occurred
   */
  renderRebalancingTimeline() {
    console.log('🔄 Rendering rebalancing timeline...');
    if (!this.data.result || !this.data.test) {
      console.warn('⚠️ Missing data for rebalancing timeline');
      return;
    }

    // Scope to user selection if available
    const mSel = document.getElementById('portfolio_market_select')?.value;
    const modelSel = document.getElementById('model_select')?.value;
    const sEl = document.getElementById('portfolio_start_date')?.value;
    const eEl = document.getElementById('portfolio_end_date')?.value;

    const filtered = this.data.result
      .filter(r => (!mSel || r.market === mSel) && (!modelSel || r.model === modelSel))
      .filter(r => (!sEl || new Date(r.date) >= new Date(sEl)) && (!eEl || new Date(r.date) <= new Date(eEl)));

    const markets = this.unique(filtered.map(r => r.market).filter(Boolean));
    const traces = [];

    markets.forEach(market => {
      const marketRebalancingData = filtered
        .filter(r => r.market === market && r.date && r["Final Portfolio Value"] != null)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (marketRebalancingData.length === 0) return;

      // Get market volatility data
      const marketData = this.data.test.filter(r => r.market === market);
      const volatilityData = this.calculateMarketVolatility(marketData);

      // Create rebalancing events for this market
      const rebalancingEvents = marketRebalancingData.map(row => {
        const portfolioValue = row["Final Portfolio Value"];
        const returnValue = (portfolioValue - 1) * 100; // Convert to percentage
        return {
          x: row.date,
          y: returnValue,
          text: `${market.toUpperCase()} Rebalancing<br>Date: ${row.date}<br>Portfolio Value: ${portfolioValue.toFixed(4)}<br>Return: ${returnValue.toFixed(2)}%`,
          marker: { 
            color: this.getMarketColor(market), 
            size: 12,
            symbol: 'diamond'
          }
        };
      });

      // Add rebalancing events trace
      traces.push({
        x: rebalancingEvents.map(e => e.x),
        y: rebalancingEvents.map(e => e.y),
        type: 'scatter',
        mode: 'markers',
        name: `${market.toUpperCase()} Rebalancing`,
        marker: { 
          color: this.getMarketColor(market),
          size: 10,
          symbol: 'diamond'
        },
        text: rebalancingEvents.map(e => e.text),
        hovertemplate: '%{text}<extra></extra>'
      });

      // Add volatility trace for this market
      if (volatilityData.volatility.length > 0) {
        traces.push({
          x: volatilityData.dates,
          y: volatilityData.volatility,
          type: 'scatter',
          mode: 'lines',
          name: `${market.toUpperCase()} Volatility`,
          yaxis: 'y2',
          line: { color: this.getMarketColor(market), width: 1, dash: 'dot' },
          opacity: 0.6
        });
      }
    });

    const layout = {
      title: '🔄 DeepAries Adaptive Rebalancing Timeline',
      xaxis: { title: 'Date' },
      yaxis: { 
        title: 'Portfolio Return (%)',
        tickformat: '.1f'
      },
      yaxis2: {
        title: 'Market Volatility',
        overlaying: 'y',
        side: 'right'
      },
      margin: { t: 40, r: 60, b: 40, l: 50 },
      hovermode: 'x unified',
      showlegend: true,
      annotations: [{
        x: 0.02,
        y: 0.98,
        xref: 'paper',
        yref: 'paper',
        text: 'Diamonds: Rebalancing Events • Dotted Lines: Market Volatility',
        showarrow: false,
        font: { size: 12, color: '#6b7280' },
        bgcolor: 'rgba(255,255,255,0.8)',
        bordercolor: '#e2e8f0',
        borderwidth: 1
      }]
    };

    const rtEl = document.getElementById('rebalancing_timeline');
    if (!rtEl) return;
    if (traces.length === 0) {
      rtEl.innerHTML = '<div style="padding:12px;color:#6b7280">No data available for the selected market/model/date.</div>';
    } else {
      this.createChartContainer('rebalancing_timeline');
      Plotly.newPlot('rebalancing_timeline', traces, layout, { responsive: true });
    }
  }

  /**
   * Render portfolio vs benchmark performance comparison
   */
  renderPerformanceComparison() {
    console.log('📈 Rendering performance comparison...');
    if (!this.data.result || !this.data.test) {
      console.warn('⚠️ Missing data for performance comparison');
      return;
    }

    // Get portfolio values by market
    const markets = this.unique(this.data.result.map(r => r.market).filter(Boolean));
    const traces = [];

    markets.forEach(market => {
      const portfolioData = this.data.result
        .filter(r => r.market === market && r.date && r["Final Portfolio Value"] != null)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (portfolioData.length === 0) return;

      // Get corresponding benchmark data
      const benchmarkData = this.data.test
        .filter(r => r.market === market && r.date && r.close != null)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (benchmarkData.length === 0) return;

      // Normalize both to starting value of 1
      const normalizedPortfolio = this.normalizeToStartingValue(
        portfolioData.map(r => ({ date: r.date, value: r["Final Portfolio Value"] }))
      );

      const normalizedBenchmark = this.normalizeToStartingValue(
        benchmarkData.map(r => ({ date: r.date, value: r.close }))
      );

      // Portfolio trace
      traces.push({
        x: normalizedPortfolio.map(d => d.date),
        y: normalizedPortfolio.map(d => d.normalizedValue),
        type: 'scatter',
        mode: 'lines',
        name: `DeepAries ${market.toUpperCase()}`,
        line: { color: this.getMarketColor(market), width: 3 }
      });

      // Benchmark trace
      traces.push({
        x: normalizedBenchmark.map(d => d.date),
        y: normalizedBenchmark.map(d => d.normalizedValue),
        type: 'scatter',
        mode: 'lines',
        name: `${market.toUpperCase()} Benchmark`,
        line: { color: this.getMarketColor(market), width: 2, dash: 'dash' }
      });
    });

    const layout = {
      title: '📈 DeepAries Portfolio vs Benchmark Performance (Normalized)',
      xaxis: { title: 'Date' },
      yaxis: { 
        title: 'Cumulative Return (Normalized)',
        tickformat: '.2f'
      },
      margin: { t: 40, r: 10, b: 40, l: 50 },
      hovermode: 'x unified',
      showlegend: true,
      annotations: [{
        x: 0.02,
        y: 0.98,
        xref: 'paper',
        yref: 'paper',
        text: 'Starting Value: 1.00 • Solid: DeepAries • Dashed: Benchmark',
        showarrow: false,
        font: { size: 12, color: '#6b7280' },
        bgcolor: 'rgba(255,255,255,0.8)',
        bordercolor: '#e2e8f0',
        borderwidth: 1
      }]
    };

    this.createChartContainer('performance_comparison');
    Plotly.newPlot('performance_comparison', traces, layout, { responsive: true });
  }

  /**
   * Render rebalancing frequency analysis
   */
  renderRebalancingFrequency() {
    console.log('📊 Rendering rebalancing frequency...');
    if (!this.data.result) {
      console.warn('⚠️ Missing result data for rebalancing frequency');
      return;
    }

    // Scope to user selection
    const mSel = document.getElementById('portfolio_market_select')?.value;
    const modelSel = document.getElementById('model_select')?.value;
    const sEl = document.getElementById('portfolio_start_date')?.value;
    const eEl = document.getElementById('portfolio_end_date')?.value;

    const subset = this.data.result
      .filter(r => (!mSel || r.market === mSel) && (!modelSel || r.model === modelSel))
      .filter(r => (!sEl || new Date(r.date) >= new Date(sEl)) && (!eEl || new Date(r.date) <= new Date(eEl)));

    const markets = this.unique(subset.map(r => r.market).filter(Boolean));
    const traces = [];

    markets.forEach(market => {
      const marketRebalancingDates = this.unique(
        subset.filter(r => r.market === market && r.date).map(r => r.date)
      ).sort((a, b) => new Date(a) - new Date(b));

      if (marketRebalancingDates.length < 2) return;

      const intervals = [];
      for (let i = 1; i < marketRebalancingDates.length; i++) {
        const prevDate = new Date(marketRebalancingDates[i-1]);
        const currDate = new Date(marketRebalancingDates[i]);
        const daysDiff = Math.ceil((currDate - prevDate) / (1000 * 60 * 60 * 24));
        intervals.push(daysDiff);
      }

      if (intervals.length === 0) return;

      // Create histogram for this market
      traces.push({
        x: intervals,
        type: 'histogram',
        name: `${market.toUpperCase()} Intervals`,
        marker: { color: this.getMarketColor(market) },
        opacity: 0.7,
        nbinsx: Math.min(15, Math.ceil(Math.sqrt(intervals.length))),
        hovertemplate: `${market.toUpperCase()}<br>Days: %{x}<br>Frequency: %{y}<extra></extra>`
      });
    });

    const layout = {
      title: '📊 DeepAries Rebalancing Frequency Distribution by Market',
      xaxis: { title: 'Days Between Rebalancing' },
      yaxis: { title: 'Frequency' },
      margin: { t: 40, r: 10, b: 40, l: 50 },
      showlegend: true,
      barmode: 'overlay',
      annotations: [{
        x: 0.02,
        y: 0.98,
        xref: 'paper',
        yref: 'paper',
        text: 'Shows adaptive rebalancing intervals across different markets',
        showarrow: false,
        font: { size: 12, color: '#6b7280' },
        bgcolor: 'rgba(255,255,255,0.8)',
        bordercolor: '#e2e8f0',
        borderwidth: 1
      }]
    };

    const rfEl = document.getElementById('rebalancing_frequency');
    if (!rfEl) return;
    if (traces.length === 0) {
      rfEl.innerHTML = '<div style="padding:12px;color:#6b7280">No rebalancing events in the selected range.</div>';
    } else {
      this.createChartContainer('rebalancing_frequency');
      Plotly.newPlot('rebalancing_frequency', traces, layout, { responsive: true });
    }
  }

  /**
   * Calculate market volatility using rolling window
   */
  calculateMarketVolatility(marketData, window = 30) {
    const prices = marketData.map(d => d.close);
    const dates = marketData.map(d => d.date);
    const volatility = [];

    for (let i = window; i < prices.length; i++) {
      const windowPrices = prices.slice(i - window, i);
      const returns = [];
      
      for (let j = 1; j < windowPrices.length; j++) {
        returns.push((windowPrices[j] - windowPrices[j-1]) / windowPrices[j-1]);
      }
      
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      const vol = Math.sqrt(variance) * Math.sqrt(252); // Annualized
      
      volatility.push(vol);
    }

    return {
      dates: dates.slice(window),
      volatility: volatility
    };
  }

  /**
   * Normalize data to starting value of 1
   */
  normalizeToStartingValue(data) {
    if (!data.length) return [];
    
    const firstValue = data[0].value;
    return data.map(d => ({
      date: d.date,
      normalizedValue: d.value / firstValue
    }));
  }

  /**
   * Render market condition detection and visualization
   */
  renderMarketConditionDetection() {
    console.log('🔍 Rendering market condition detection...');
    if (!this.data.test || !this.data.result) {
      console.warn('⚠️ Missing data for market condition detection');
      return;
    }

    // Scope to selection
    const mSel = document.getElementById('portfolio_market_select')?.value;
    const modelSel = document.getElementById('model_select')?.value;
    const sEl = document.getElementById('portfolio_start_date')?.value;
    const eEl = document.getElementById('portfolio_end_date')?.value;

    const subset = this.data.result
      .filter(r => (!mSel || r.market === mSel) && (!modelSel || r.model === modelSel))
      .filter(r => (!sEl || new Date(r.date) >= new Date(sEl)) && (!eEl || new Date(r.date) <= new Date(eEl)));

    const markets = this.unique(subset.map(r => r.market).filter(Boolean));
    const traces = [];

    markets.forEach(market => {
      // Get market data (benchmark) and calculate conditions for selected window
      let marketData = this.data.test.filter(r => r.market === market);
      marketData = marketData.filter(r => (!sEl || new Date(r.date) >= new Date(sEl)) && (!eEl || new Date(r.date) <= new Date(eEl)));
      if (marketData.length === 0) return;
      
      const marketConditions = this.analyzeMarketConditions(marketData);
      if (marketConditions.volatility.length === 0) return;
      
      // Get rebalancing dates for this market
      const marketRebalancingDates = this.unique(
        subset.filter(r => r.market === market && r.date).map(r => r.date)
      ).sort((a, b) => new Date(a) - new Date(b));

      // Volatility condition
      traces.push({
        x: marketConditions.dates,
        y: marketConditions.volatility,
        type: 'scatter',
        mode: 'lines',
        name: `${market.toUpperCase()} Volatility`,
        line: { color: this.getMarketColor(market), width: 1, dash: 'dot' },
        yaxis: 'y2',
        opacity: 0.6
      });

      // Market trend condition
      traces.push({
        x: marketConditions.dates,
        y: marketConditions.trend,
        type: 'scatter',
        mode: 'lines',
        name: `${market.toUpperCase()} Trend`,
        line: { color: this.getMarketColor(market), width: 2 },
        yaxis: 'y'
      });

      // Rebalancing events overlay for this market
      const rebalancingEvents = marketRebalancingDates.map(date => {
        const condition = this.getMarketConditionAtDate(marketConditions, date);
        const portfolioData = this.data.result.find(r => r.market === market && r.date === date);
        const portfolioValue = portfolioData ? portfolioData["Final Portfolio Value"] : 1;
        const returnValue = (portfolioValue - 1) * 100;
        
        return {
          x: date,
          y: condition.trend,
          text: `${market.toUpperCase()} Rebalancing<br>Date: ${date}<br>Volatility: ${(condition.volatility * 100).toFixed(1)}%<br>Trend: ${condition.trend > 0 ? 'Bullish' : 'Bearish'}<br>Portfolio Return: ${returnValue.toFixed(2)}%`,
          marker: { 
            color: this.getMarketColor(market),
            size: 12,
            symbol: 'diamond'
          }
        };
      });

      if (rebalancingEvents.length > 0) {
        traces.push({
          x: rebalancingEvents.map(e => e.x),
          y: rebalancingEvents.map(e => e.y),
          type: 'scatter',
          mode: 'markers',
          name: `${market.toUpperCase()} Rebalancing`,
          yaxis: 'y',
          marker: { 
            color: this.getMarketColor(market),
            size: 10,
            symbol: 'diamond'
          },
          text: rebalancingEvents.map(e => e.text),
          hovertemplate: '%{text}<extra></extra>'
        });
      }
    });

    const layout = {
      title: '🔍 DeepAries Market Condition Detection & Adaptive Rebalancing',
      xaxis: { title: 'Date' },
      yaxis: { 
        title: 'Market Trend (Normalized)',
        range: [-1, 1]
      },
      yaxis2: {
        title: 'Volatility',
        overlaying: 'y',
        side: 'right'
      },
      margin: { t: 40, r: 60, b: 40, l: 50 },
      hovermode: 'x unified',
      showlegend: true,
      annotations: [
        {
          x: 0.02,
          y: 0.98,
          xref: 'paper',
          yref: 'paper',
          text: 'Diamonds: Rebalancing Events • Solid Lines: Market Trends • Dotted Lines: Volatility',
          showarrow: false,
          font: { size: 12, color: '#6b7280' },
          bgcolor: 'rgba(255,255,255,0.8)',
          bordercolor: '#e2e8f0',
          borderwidth: 1
        }
      ]
    };

    const mcdEl = document.getElementById('market_condition_detection');
    if (!mcdEl) return;
    if (traces.length === 0) {
      mcdEl.innerHTML = '<div style="padding:12px;color:#6b7280">No benchmark/condition data in selected period.</div>';
    } else {
      this.createChartContainer('market_condition_detection');
      Plotly.newPlot('market_condition_detection', traces, layout, { responsive: true });
    }
  }

  /**
   * Render portfolio weights change over time
   */
  renderPortfolioWeightsChange() {
    console.log('📊 Rendering portfolio weights change...');
    if (!this.data.result) {
      console.warn('⚠️ Missing result data for portfolio weights change');
      return;
    }

    // Get portfolio data by market
    const markets = this.unique(this.data.result.map(r => r.market).filter(Boolean));
    const traces = [];

    markets.forEach(market => {
      const marketData = this.data.result
        .filter(r => r.market === market && r.date && r.portfolio_ratio)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (marketData.length === 0) return;

      // Parse portfolio ratios and get top assets for this market
      const weightsOverTime = [];
      const dates = [];
      const topAssets = new Set();

      marketData.forEach(row => {
        const portfolioRatio = this.sanitizePortfolioString(row.portfolio_ratio);
        if (portfolioRatio && portfolioRatio.all) {
          dates.push(row.date);
          weightsOverTime.push(portfolioRatio.all);
          
          // Collect top assets (only those with significant weights)
          Object.keys(portfolioRatio.all).forEach(asset => {
            if (portfolioRatio.all[asset] > 0.04) { // 4% threshold
              topAssets.add(asset);
            }
          });
        }
      });

      if (dates.length === 0) return;

      // Create traces for top assets in this market
      const topAssetsArray = Array.from(topAssets).slice(0, 8); // Limit to top 8 per market

      topAssetsArray.forEach(asset => {
        const weights = weightsOverTime.map(weights => weights[asset] || 0);
        traces.push({
          x: dates,
          y: weights,
          type: 'scatter',
          mode: 'lines',
          name: `${market.toUpperCase()}: ${asset}`,
          line: { 
            width: 2,
            color: this.getMarketColor(market)
          },
          stackgroup: market, // Stack by market
          hovertemplate: `${market.toUpperCase()}<br>${asset}<br>Weight: %{y:.1%}<br>Date: %{x}<extra></extra>`
        });
      });
    });

    const layout = {
      title: '📊 DeepAries Portfolio Weights Change Over Time',
      xaxis: { title: 'Date' },
      yaxis: { 
        title: 'Portfolio Weight',
        tickformat: '.1%',
        range: [0, 1]
      },
      margin: { t: 40, r: 10, b: 40, l: 50 },
      hovermode: 'x unified',
      showlegend: true,
      annotations: [{
        x: 0.02,
        y: 0.98,
        xref: 'paper',
        yref: 'paper',
        text: 'Stacked by market showing adaptive portfolio allocation changes',
        showarrow: false,
        font: { size: 12, color: '#6b7280' },
        bgcolor: 'rgba(255,255,255,0.8)',
        bordercolor: '#e2e8f0',
        borderwidth: 1
      }]
    };

    this.createChartContainer('portfolio_weights_change');
    Plotly.newPlot('portfolio_weights_change', traces, layout, { responsive: true });
  }

  /**
   * Analyze market conditions from market data
   */
  analyzeMarketConditions(marketData, window = 30) {
    const prices = marketData.map(d => d.close);
    const dates = marketData.map(d => d.date);
    const conditions = {
      dates: [],
      volatility: [],
      trend: []
    };

    for (let i = window; i < prices.length; i++) {
      const windowPrices = prices.slice(i - window, i);
      const currentPrice = prices[i];
      const avgPrice = windowPrices.reduce((a, b) => a + b, 0) / windowPrices.length;
      
      // Calculate volatility
      const returns = [];
      for (let j = 1; j < windowPrices.length; j++) {
        returns.push((windowPrices[j] - windowPrices[j-1]) / windowPrices[j-1]);
      }
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance);
      
      // Calculate trend (normalized)
      const trend = (currentPrice - avgPrice) / avgPrice;
      
      conditions.dates.push(dates[i]);
      conditions.volatility.push(volatility);
      conditions.trend.push(trend);
    }

    return conditions;
  }

  /**
   * Get market condition at specific date
   */
  getMarketConditionAtDate(marketConditions, targetDate) {
    const target = new Date(targetDate);
    let closestIndex = 0;
    let minDiff = Math.abs(new Date(marketConditions.dates[0]) - target);

    for (let i = 1; i < marketConditions.dates.length; i++) {
      const diff = Math.abs(new Date(marketConditions.dates[i]) - target);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    return {
      volatility: marketConditions.volatility[closestIndex],
      trend: marketConditions.trend[closestIndex]
    };
  }

  /**
   * Get color for market
   */
  getMarketColor(market) {
    const colors = {
      'csi300': '#2563eb',  // Blue
      'dj30': '#dc2626',    // Red
      'ftse': '#059669',    // Green
      'kospi': '#7c3aed'    // Purple
    };
    return colors[market] || '#6b7280'; // Default gray
  }

  /**
   * Render portfolio risk analysis
   */
  renderPortfolioRiskAnalysis() {
    console.log('📈 Rendering portfolio risk analysis...');
    if (!this.data.result) {
      console.warn('⚠️ Missing result data for portfolio risk analysis');
      return;
    }

    // Calculate portfolio risk metrics
    const markets = this.unique(this.data.result.map(r => r.market).filter(Boolean));
    const riskData = [];

    markets.forEach(market => {
      const marketData = this.data.result
        .filter(r => r.market === market && r["Final Portfolio Value"] != null)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (marketData.length < 2) return;

      // Calculate returns
      const returns = [];
      for (let i = 1; i < marketData.length; i++) {
        const prevValue = marketData[i-1]["Final Portfolio Value"];
        const currValue = marketData[i]["Final Portfolio Value"];
        const returnValue = (currValue - prevValue) / prevValue;
        returns.push(returnValue);
      }

      // Calculate risk metrics
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized
      const sharpeRatio = mean / Math.sqrt(variance) * Math.sqrt(252);

      riskData.push({
        market: market.toUpperCase(),
        volatility: volatility,
        sharpeRatio: sharpeRatio,
        meanReturn: mean * 252 // Annualized
      });
    });

    // Create risk scatter plot
    const trace = {
      x: riskData.map(d => d.volatility),
      y: riskData.map(d => d.meanReturn),
      mode: 'markers+text',
      type: 'scatter',
      text: riskData.map(d => d.market),
      textposition: 'top center',
      marker: {
        size: 12,
        color: riskData.map(d => this.getMarketColor(d.market.toLowerCase())),
        line: { width: 2, color: 'white' }
      },
      name: 'Portfolio Risk-Return'
    };

    const layout = {
      title: '📈 Portfolio Risk-Return Analysis',
      xaxis: { title: 'Volatility (Annualized)' },
      yaxis: { title: 'Expected Return (Annualized)' },
      margin: { t: 40, r: 10, b: 40, l: 50 },
      showlegend: false
    };

    this.createChartContainer('portfolio_risk_analysis');
    Plotly.newPlot('portfolio_risk_analysis', [trace], layout, { responsive: true });
  }

  /**
   * Render drawdown analysis
   */
  renderDrawdownAnalysis() {
    console.log('📉 Rendering drawdown analysis...');
    if (!this.data.result) {
      console.warn('⚠️ Missing result data for drawdown analysis');
      return;
    }

    const markets = this.unique(this.data.result.map(r => r.market).filter(Boolean));
    const traces = [];

    markets.forEach(market => {
      const marketData = this.data.result
        .filter(r => r.market === market && r["Final Portfolio Value"] != null)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (marketData.length < 2) return;

      // Calculate drawdown
      const dates = marketData.map(d => d.date);
      const values = marketData.map(d => d["Final Portfolio Value"]);
      const drawdowns = [];
      let peak = values[0];

      values.forEach(value => {
        if (value > peak) peak = value;
        const drawdown = (value - peak) / peak;
        drawdowns.push(drawdown);
      });

      traces.push({
        x: dates,
        y: drawdowns,
        type: 'scatter',
        mode: 'lines',
        name: `${market.toUpperCase()} Drawdown`,
        line: { color: this.getMarketColor(market), width: 2 },
        fill: 'tonexty'
      });
    });

    const layout = {
      title: '📉 Portfolio Drawdown Analysis',
      xaxis: { title: 'Date' },
      yaxis: { 
        title: 'Drawdown (%)',
        tickformat: '.1%'
      },
      margin: { t: 40, r: 10, b: 40, l: 50 },
      showlegend: true
    };

    this.createChartContainer('drawdown_analysis');
    Plotly.newPlot('drawdown_analysis', traces, layout, { responsive: true });
  }

  /**
   * Render risk-adjusted returns
   */
  renderRiskAdjustedReturns() {
    console.log('⚖️ Rendering risk-adjusted returns...');
    if (!this.data.result) {
      console.warn('⚠️ Missing result data for risk-adjusted returns');
      return;
    }

    const markets = this.unique(this.data.result.map(r => r.market).filter(Boolean));
    const metrics = [];

    markets.forEach(market => {
      const marketData = this.data.result
        .filter(r => r.market === market && r["Final Portfolio Value"] != null)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (marketData.length < 2) return;

      // Calculate returns
      const returns = [];
      for (let i = 1; i < marketData.length; i++) {
        const prevValue = marketData[i-1]["Final Portfolio Value"];
        const currValue = marketData[i]["Final Portfolio Value"];
        const returnValue = (currValue - prevValue) / prevValue;
        returns.push(returnValue);
      }

      // Calculate risk-adjusted metrics
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance);
      const sharpeRatio = mean / volatility * Math.sqrt(252);
      
      // Sortino ratio (downside deviation)
      const negativeReturns = returns.filter(r => r < 0);
      const downsideVariance = negativeReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / returns.length;
      const downsideDeviation = Math.sqrt(downsideVariance);
      const sortinoRatio = mean / downsideDeviation * Math.sqrt(252);

      metrics.push({
        market: market.toUpperCase(),
        sharpeRatio: sharpeRatio,
        sortinoRatio: sortinoRatio,
        volatility: volatility * Math.sqrt(252)
      });
    });

    // Create bar chart
    const trace = {
      x: metrics.map(m => m.market),
      y: metrics.map(m => m.sharpeRatio),
      type: 'bar',
      name: 'Sharpe Ratio',
      marker: { color: '#2563eb' }
    };

    const trace2 = {
      x: metrics.map(m => m.market),
      y: metrics.map(m => m.sortinoRatio),
      type: 'bar',
      name: 'Sortino Ratio',
      marker: { color: '#059669' }
    };

    const layout = {
      title: '⚖️ Risk-Adjusted Returns Comparison',
      xaxis: { title: 'Market' },
      yaxis: { title: 'Ratio' },
      margin: { t: 40, r: 10, b: 40, l: 50 },
      barmode: 'group',
      showlegend: true
    };

    this.createChartContainer('risk_adjusted_returns');
    Plotly.newPlot('risk_adjusted_returns', [trace, trace2], layout, { responsive: true });
  }

  /**
   * Render correlation analysis
   */
  renderCorrelationAnalysis() {
    console.log('🔗 Rendering correlation analysis...');
    if (!this.data.result) {
      console.warn('⚠️ Missing result data for correlation analysis');
      return;
    }

    const markets = this.unique(this.data.result.map(r => r.market).filter(Boolean));
    const correlationMatrix = [];

    // Calculate correlation between markets
    for (let i = 0; i < markets.length; i++) {
      const row = [];
      for (let j = 0; j < markets.length; j++) {
        if (i === j) {
          row.push(1.0);
        } else {
          const correlation = this.calculateMarketCorrelation(markets[i], markets[j]);
          row.push(correlation);
        }
      }
      correlationMatrix.push(row);
    }

    const trace = {
      z: correlationMatrix,
      x: markets.map(m => m.toUpperCase()),
      y: markets.map(m => m.toUpperCase()),
      type: 'heatmap',
      colorscale: 'RdBu',
      zmid: 0,
      text: correlationMatrix.map(row => 
        row.map(val => val.toFixed(3))
      ),
      texttemplate: '%{text}',
      textfont: { size: 12 }
    };

    const layout = {
      title: '🔗 Market Correlation Matrix',
      margin: { t: 40, r: 10, b: 40, l: 50 }
    };

    this.createChartContainer('correlation_analysis');
    Plotly.newPlot('correlation_analysis', [trace], layout, { responsive: true });
  }

  /**
   * Calculate correlation between two markets
   */
  calculateMarketCorrelation(market1, market2) {
    const data1 = this.data.result
      .filter(r => r.market === market1 && r["Final Portfolio Value"] != null)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const data2 = this.data.result
      .filter(r => r.market === market2 && r["Final Portfolio Value"] != null)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (data1.length < 2 || data2.length < 2) return 0;

    // Calculate returns
    const returns1 = [];
    const returns2 = [];
    
    for (let i = 1; i < Math.min(data1.length, data2.length); i++) {
      const ret1 = (data1[i]["Final Portfolio Value"] - data1[i-1]["Final Portfolio Value"]) / data1[i-1]["Final Portfolio Value"];
      const ret2 = (data2[i]["Final Portfolio Value"] - data2[i-1]["Final Portfolio Value"]) / data2[i-1]["Final Portfolio Value"];
      returns1.push(ret1);
      returns2.push(ret2);
    }

    if (returns1.length < 2) return 0;

    // Calculate correlation
    const mean1 = returns1.reduce((a, b) => a + b, 0) / returns1.length;
    const mean2 = returns2.reduce((a, b) => a + b, 0) / returns2.length;

    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;

    for (let i = 0; i < returns1.length; i++) {
      const diff1 = returns1[i] - mean1;
      const diff2 = returns2[i] - mean2;
      numerator += diff1 * diff2;
      sumSq1 += diff1 * diff1;
      sumSq2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(sumSq1 * sumSq2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Create chart container if it doesn't exist
   */
  createChartContainer(containerId) {
    // Container already exists in HTML, no need to create
    return;
  }

}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing dashboard...');
  
  // Initialize dashboard
  try {
    window.dashboard = new StockDashboard();
    console.log('Dashboard initialized successfully');
  } catch (error) {
    console.error('Error initializing dashboard:', error);
  }
});
