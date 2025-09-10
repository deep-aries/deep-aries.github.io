/**
 * Technical Analysis Module for DeepAries Dashboard
 * Implements various technical indicators and analysis tools
 */

class TechnicalAnalysis {
  constructor() {
    this.data = null;
    this.indicators = {};
  }

  /**
   * Set market data for analysis
   * @param {Array} data - Array of market data objects with date, close, high, low, volume
   */
  setData(data) {
    if (!data || !Array.isArray(data)) {
      this.data = [];
      return;
    }
    
    this.data = data.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Calculate Simple Moving Average (SMA)
   * @param {Array} prices - Array of price values
   * @param {number} period - Period for SMA calculation
   * @returns {Array} SMA values
   */
  calculateSMA(prices, period) {
    if (!prices || prices.length < period) {
      console.warn(`[TECH] Insufficient data for SMA(${period}): need ${period}, have ${prices?.length || 0}`);
      return [];
    }

    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    
    console.log(`[TECH] SMA(${period}) calculated:`, sma.length, 'values');
    return sma;
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   * @param {Array} prices - Array of price values
   * @param {number} period - Period for EMA calculation
   * @returns {Array} EMA values
   */
  calculateEMA(prices, period) {
    if (!prices || prices.length < period) {
      console.warn(`[TECH] Insufficient data for EMA(${period}): need ${period}, have ${prices?.length || 0}`);
      return [];
    }

    const ema = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA value is SMA
    const firstSMA = this.calculateSMA(prices.slice(0, period), period)[0];
    ema.push(firstSMA);
    
    // Calculate subsequent EMA values
    for (let i = period; i < prices.length; i++) {
      const emaValue = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
      ema.push(emaValue);
    }
    
    console.log(`[TECH] EMA(${period}) calculated:`, ema.length, 'values');
    return ema;
  }

  /**
   * Calculate Relative Strength Index (RSI)
   * @param {Array} prices - Array of price values
   * @param {number} period - Period for RSI calculation (default: 14)
   * @returns {Array} RSI values
   */
  calculateRSI(prices, period = 14) {
    if (!prices || prices.length < period + 1) {
      console.warn(`[TECH] Insufficient data for RSI(${period}): need ${period + 1}, have ${prices?.length || 0}`);
      return [];
    }

    const gains = [];
    const losses = [];
    
    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const rsi = [];
    
    // Calculate initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    // Calculate first RSI value
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
    
    // Calculate subsequent RSI values using Wilder's smoothing
    for (let i = period; i < gains.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
    
    console.log(`[TECH] RSI(${period}) calculated:`, rsi.length, 'values');
    return rsi;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   * @param {Array} prices - Array of price values
   * @param {number} fastPeriod - Fast EMA period (default: 12)
   * @param {number} slowPeriod - Slow EMA period (default: 26)
   * @param {number} signalPeriod - Signal line EMA period (default: 9)
   * @returns {Object} MACD values {macd, signal, histogram}
   */
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (!prices || prices.length < slowPeriod) {
      console.warn(`[TECH] Insufficient data for MACD: need ${slowPeriod}, have ${prices?.length || 0}`);
      return { macd: [], signal: [], histogram: [] };
    }

    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    // Align arrays (slow EMA starts later)
    const startIndex = slowPeriod - fastPeriod;
    const alignedFastEMA = fastEMA.slice(startIndex);
    const alignedSlowEMA = slowEMA;
    
    // Calculate MACD line
    const macd = alignedFastEMA.map((fast, i) => fast - alignedSlowEMA[i]);
    
    // Calculate signal line (EMA of MACD)
    const signal = this.calculateEMA(macd, signalPeriod);
    
    // Calculate histogram
    const histogram = macd.slice(signalPeriod - 1).map((macdVal, i) => macdVal - signal[i]);
    
    console.log(`[TECH] MACD(${fastPeriod},${slowPeriod},${signalPeriod}) calculated:`, {
      macd: macd.length,
      signal: signal.length,
      histogram: histogram.length
    });
    
    return { macd, signal, histogram };
  }

  /**
   * Calculate Bollinger Bands
   * @param {Array} prices - Array of price values
   * @param {number} period - Period for SMA calculation (default: 20)
   * @param {number} stdDev - Standard deviation multiplier (default: 2)
   * @returns {Object} Bollinger Bands {upper, middle, lower}
   */
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (!prices || prices.length < period) {
      console.warn(`[TECH] Insufficient data for Bollinger Bands(${period}): need ${period}, have ${prices?.length || 0}`);
      return { upper: [], middle: [], lower: [] };
    }

    const middle = this.calculateSMA(prices, period);
    const upper = [];
    const lower = [];
    
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = middle[i - period + 1];
      
      // Calculate standard deviation
      const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      upper.push(mean + (stdDev * standardDeviation));
      lower.push(mean - (stdDev * standardDeviation));
    }
    
    console.log(`[TECH] Bollinger Bands(${period}, ${stdDev}) calculated:`, {
      upper: upper.length,
      middle: middle.length,
      lower: lower.length
    });
    
    return { upper, middle, lower };
  }

  /**
   * Calculate Stochastic Oscillator
   * @param {Array} data - Array of OHLC data objects
   * @param {number} kPeriod - %K period (default: 14)
   * @param {number} dPeriod - %D period (default: 3)
   * @returns {Object} Stochastic values {k, d}
   */
  calculateStochastic(data, kPeriod = 14, dPeriod = 3) {
    if (!data || data.length < kPeriod) {
      console.warn(`[TECH] Insufficient data for Stochastic(${kPeriod}): need ${kPeriod}, have ${data?.length || 0}`);
      return { k: [], d: [] };
    }

    const k = [];
    
    for (let i = kPeriod - 1; i < data.length; i++) {
      const slice = data.slice(i - kPeriod + 1, i + 1);
      const currentClose = data[i].close;
      const lowestLow = Math.min(...slice.map(d => d.low));
      const highestHigh = Math.max(...slice.map(d => d.high));
      
      const kValue = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
      k.push(kValue);
    }
    
    // Calculate %D (SMA of %K)
    const d = this.calculateSMA(k, dPeriod);
    
    console.log(`[TECH] Stochastic(${kPeriod}, ${dPeriod}) calculated:`, {
      k: k.length,
      d: d.length
    });
    
    return { k, d };
  }

  /**
   * Get indicator data for a specific ticker
   * @param {string} ticker - Ticker symbol
   * @param {string} indicator - Indicator name
   * @param {Object} params - Indicator parameters
   * @returns {Array|Object} Indicator values
   */
  getIndicator(ticker, indicator, params = {}) {
    if (!this.data) {
      console.error('[TECH] No data available for indicator calculation');
      return null;
    }

    // Filter data for specific ticker
    const tickerData = this.data.filter(d => d.ticker === ticker);
    if (tickerData.length === 0) {
      console.warn(`[TECH] No data found for ticker: ${ticker}`);
      return null;
    }

    const prices = tickerData.map(d => parseFloat(d.close));
    
    switch (indicator.toLowerCase()) {
      case 'sma':
        return this.calculateSMA(prices, params.period || 20);
      case 'ema':
        return this.calculateEMA(prices, params.period || 20);
      case 'rsi':
        return this.calculateRSI(prices, params.period || 14);
      case 'macd':
        return this.calculateMACD(prices, params.fastPeriod || 12, params.slowPeriod || 26, params.signalPeriod || 9);
      case 'bollinger':
        return this.calculateBollingerBands(prices, params.period || 20, params.stdDev || 2);
      case 'stochastic':
        return this.calculateStochastic(tickerData, params.kPeriod || 14, params.dPeriod || 3);
      default:
        console.warn(`[TECH] Unknown indicator: ${indicator}`);
        return null;
    }
  }

  /**
   * Get available tickers from data
   * @returns {Array} Array of ticker symbols
   */
  getAvailableTickers() {
    if (!this.data || !Array.isArray(this.data)) {
      console.warn('[TECH] No data available for getAvailableTickers');
      return [];
    }
    
    const tickers = [...new Set(this.data.map(d => d.ticker).filter(Boolean))].sort();
    console.log('[TECH] Available tickers:', tickers);
    return tickers;
  }

  /**
   * Get date range for a specific ticker
   * @param {string} ticker - Ticker symbol
   * @returns {Object} Date range {start, end}
   */
  getDateRange(ticker) {
    if (!this.data) return { start: null, end: null };
    
    const tickerData = this.data.filter(d => d.ticker === ticker);
    if (tickerData.length === 0) return { start: null, end: null };
    
    const dates = tickerData.map(d => new Date(d.date)).sort((a, b) => a - b);
    return {
      start: dates[0],
      end: dates[dates.length - 1]
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TechnicalAnalysis;
} else {
  window.TechnicalAnalysis = TechnicalAnalysis;
}
