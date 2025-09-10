/**
 * Risk Management Module for DeepAries Dashboard
 * Implements VaR, Expected Shortfall, and other risk metrics
 */

class RiskManagement {
  constructor() {
    this.data = null;
    this.riskMetrics = {};
  }

  /**
   * Set market data for risk analysis
   * @param {Array} data - Array of market data objects
   */
  setData(data) {
    this.data = data.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Calculate returns from price data
   * @param {Array} prices - Array of price values
   * @returns {Array} Array of returns
   */
  calculateReturns(prices) {
    if (!prices || prices.length < 2) {
      console.warn('[RISK] Insufficient data for returns calculation');
      return [];
    }

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const returnValue = (prices[i] - prices[i-1]) / prices[i-1];
      returns.push(returnValue);
    }

    console.log('[RISK] Returns calculated:', returns.length, 'values');
    return returns;
  }

  /**
   * Calculate portfolio returns from individual asset returns
   * @param {Array} assetReturns - Array of asset return arrays
   * @param {Array} weights - Portfolio weights
   * @returns {Array} Portfolio returns
   */
  calculatePortfolioReturns(assetReturns, weights) {
    if (!assetReturns || !weights || assetReturns.length !== weights.length) {
      console.warn('[RISK] Invalid input for portfolio returns calculation');
      return [];
    }

    const minLength = Math.min(...assetReturns.map(arr => arr.length));
    const portfolioReturns = [];

    for (let i = 0; i < minLength; i++) {
      let portfolioReturn = 0;
      for (let j = 0; j < assetReturns.length; j++) {
        portfolioReturn += assetReturns[j][i] * weights[j];
      }
      portfolioReturns.push(portfolioReturn);
    }

    console.log('[RISK] Portfolio returns calculated:', portfolioReturns.length, 'values');
    return portfolioReturns;
  }

  /**
   * Calculate Historical Value at Risk (VaR)
   * @param {Array} returns - Array of returns
   * @param {number} confidenceLevel - Confidence level (0.95, 0.99, etc.)
   * @param {number} timeHorizon - Time horizon in days
   * @returns {Object} VaR results
   */
  calculateHistoricalVaR(returns, confidenceLevel = 0.95, timeHorizon = 1) {
    if (!returns || returns.length === 0) {
      console.warn('[RISK] No returns data for VaR calculation');
      return { var: null, expectedShortfall: null, percentile: null };
    }

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const percentile = (1 - confidenceLevel) * 100;
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    
    let varValue = sortedReturns[index];
    
    // Adjust for time horizon (assuming square root of time scaling)
    if (timeHorizon > 1) {
      varValue = varValue * Math.sqrt(timeHorizon);
    }

    // Calculate Expected Shortfall (Conditional VaR)
    const tailReturns = sortedReturns.slice(0, index + 1);
    const expectedShortfall = tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length;
    
    // Adjust Expected Shortfall for time horizon
    const adjustedExpectedShortfall = timeHorizon > 1 ? 
      expectedShortfall * Math.sqrt(timeHorizon) : expectedShortfall;

    const result = {
      var: varValue,
      expectedShortfall: adjustedExpectedShortfall,
      percentile: percentile,
      confidenceLevel: confidenceLevel,
      timeHorizon: timeHorizon,
      sampleSize: returns.length
    };

    console.log(`[RISK] Historical VaR calculated: ${(varValue * 100).toFixed(2)}% at ${(confidenceLevel * 100).toFixed(0)}% confidence`);
    return result;
  }

  /**
   * Calculate Parametric VaR (assuming normal distribution)
   * @param {Array} returns - Array of returns
   * @param {number} confidenceLevel - Confidence level
   * @param {number} timeHorizon - Time horizon in days
   * @returns {Object} Parametric VaR results
   */
  calculateParametricVaR(returns, confidenceLevel = 0.95, timeHorizon = 1) {
    if (!returns || returns.length === 0) {
      console.warn('[RISK] No returns data for parametric VaR calculation');
      return { var: null, expectedShortfall: null, mean: null, stdDev: null };
    }

    // Calculate mean and standard deviation
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Calculate z-score for confidence level
    const zScore = this.getZScore(confidenceLevel);
    
    // Calculate VaR
    let varValue = mean - (zScore * stdDev);
    
    // Adjust for time horizon
    if (timeHorizon > 1) {
      varValue = mean * timeHorizon - (zScore * stdDev * Math.sqrt(timeHorizon));
    }

    // Calculate Expected Shortfall (for normal distribution)
    const phi = Math.exp(-0.5 * zScore * zScore) / Math.sqrt(2 * Math.PI);
    const expectedShortfall = mean - (phi / (1 - confidenceLevel)) * stdDev;
    
    // Adjust Expected Shortfall for time horizon
    const adjustedExpectedShortfall = timeHorizon > 1 ? 
      mean * timeHorizon - (phi / (1 - confidenceLevel)) * stdDev * Math.sqrt(timeHorizon) : 
      expectedShortfall;

    const result = {
      var: varValue,
      expectedShortfall: adjustedExpectedShortfall,
      mean: mean,
      stdDev: stdDev,
      zScore: zScore,
      confidenceLevel: confidenceLevel,
      timeHorizon: timeHorizon,
      sampleSize: returns.length
    };

    console.log(`[RISK] Parametric VaR calculated: ${(varValue * 100).toFixed(2)}% at ${(confidenceLevel * 100).toFixed(0)}% confidence`);
    return result;
  }

  /**
   * Calculate Monte Carlo VaR
   * @param {Array} returns - Array of returns
   * @param {number} confidenceLevel - Confidence level
   * @param {number} timeHorizon - Time horizon in days
   * @param {number} simulations - Number of Monte Carlo simulations
   * @returns {Object} Monte Carlo VaR results
   */
  calculateMonteCarloVaR(returns, confidenceLevel = 0.95, timeHorizon = 1, simulations = 10000) {
    if (!returns || returns.length === 0) {
      console.warn('[RISK] No returns data for Monte Carlo VaR calculation');
      return { var: null, expectedShortfall: null, simulations: simulations };
    }

    // Calculate mean and standard deviation
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Generate random returns using normal distribution
    const simulatedReturns = [];
    for (let i = 0; i < simulations; i++) {
      let cumulativeReturn = 0;
      for (let day = 0; day < timeHorizon; day++) {
        // Box-Muller transformation for normal random numbers
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const randomReturn = mean + stdDev * z0;
        cumulativeReturn += randomReturn;
      }
      simulatedReturns.push(cumulativeReturn);
    }

    // Sort simulated returns
    simulatedReturns.sort((a, b) => a - b);
    
    // Calculate VaR
    const index = Math.floor((1 - confidenceLevel) * simulations);
    const varValue = simulatedReturns[index];

    // Calculate Expected Shortfall
    const tailReturns = simulatedReturns.slice(0, index + 1);
    const expectedShortfall = tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length;

    const result = {
      var: varValue,
      expectedShortfall: expectedShortfall,
      mean: mean,
      stdDev: stdDev,
      confidenceLevel: confidenceLevel,
      timeHorizon: timeHorizon,
      simulations: simulations,
      sampleSize: returns.length
    };

    console.log(`[RISK] Monte Carlo VaR calculated: ${(varValue * 100).toFixed(2)}% at ${(confidenceLevel * 100).toFixed(0)}% confidence`);
    return result;
  }

  /**
   * Get z-score for confidence level
   * @param {number} confidenceLevel - Confidence level
   * @returns {number} Z-score
   */
  getZScore(confidenceLevel) {
    const zScores = {
      0.90: 1.282,
      0.95: 1.645,
      0.99: 2.326,
      0.999: 3.090
    };
    
    return zScores[confidenceLevel] || 1.645; // Default to 95% confidence
  }

  /**
   * Calculate portfolio volatility
   * @param {Array} returns - Portfolio returns
   * @returns {number} Annualized volatility
   */
  calculateVolatility(returns) {
    if (!returns || returns.length === 0) {
      console.warn('[RISK] No returns data for volatility calculation');
      return 0;
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const dailyVolatility = Math.sqrt(variance);
    
    // Annualize volatility (assuming 252 trading days)
    const annualizedVolatility = dailyVolatility * Math.sqrt(252);
    
    console.log(`[RISK] Volatility calculated: ${(annualizedVolatility * 100).toFixed(2)}% annualized`);
    return annualizedVolatility;
  }

  /**
   * Calculate maximum drawdown
   * @param {Array} prices - Array of price values
   * @returns {Object} Maximum drawdown information
   */
  calculateMaxDrawdown(prices) {
    if (!prices || prices.length === 0) {
      console.warn('[RISK] No price data for drawdown calculation');
      return { maxDrawdown: 0, peakIndex: 0, troughIndex: 0 };
    }

    let peak = prices[0];
    let maxDrawdown = 0;
    let peakIndex = 0;
    let troughIndex = 0;

    for (let i = 0; i < prices.length; i++) {
      if (prices[i] > peak) {
        peak = prices[i];
        peakIndex = i;
      }
      
      const drawdown = (peak - prices[i]) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        troughIndex = i;
      }
    }

    console.log(`[RISK] Maximum drawdown calculated: ${(maxDrawdown * 100).toFixed(2)}%`);
    return {
      maxDrawdown: maxDrawdown,
      peakIndex: peakIndex,
      troughIndex: troughIndex,
      peakValue: prices[peakIndex],
      troughValue: prices[troughIndex]
    };
  }

  /**
   * Calculate Sharpe ratio
   * @param {Array} returns - Array of returns
   * @param {number} riskFreeRate - Risk-free rate (annual)
   * @returns {number} Sharpe ratio
   */
  calculateSharpeRatio(returns, riskFreeRate = 0.02) {
    if (!returns || returns.length === 0) {
      console.warn('[RISK] No returns data for Sharpe ratio calculation');
      return 0;
    }

    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const annualizedReturn = meanReturn * 252; // Annualize daily returns
    const volatility = this.calculateVolatility(returns);
    
    const sharpeRatio = volatility === 0 ? 0 : (annualizedReturn - riskFreeRate) / volatility;
    
    console.log(`[RISK] Sharpe ratio calculated: ${sharpeRatio.toFixed(3)}`);
    return sharpeRatio;
  }

  /**
   * Run stress test scenarios
   * @param {Array} returns - Historical returns
   * @param {Object} scenarios - Stress test scenarios
   * @returns {Object} Stress test results
   */
  runStressTest(returns, scenarios = {}) {
    const defaultScenarios = {
      marketCrash: -0.20,    // 20% market decline
      recession: -0.15,      // 15% market decline
      volatilitySpike: 0.30, // 30% volatility increase
      custom: -0.10          // 10% custom scenario
    };

    const stressScenarios = { ...defaultScenarios, ...scenarios };
    const results = {};

    for (const [scenarioName, shock] of Object.entries(stressScenarios)) {
      let stressedReturns;
      
      if (scenarioName === 'volatilitySpike') {
        // Increase volatility by shock amount
        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        const newStdDev = stdDev * (1 + shock);
        
        stressedReturns = returns.map(ret => mean + (ret - mean) * (newStdDev / stdDev));
      } else {
        // Apply return shock
        stressedReturns = returns.map(ret => ret + shock);
      }

      // Calculate VaR for stressed scenario
      const varResult = this.calculateHistoricalVaR(stressedReturns, 0.95, 1);
      
      results[scenarioName] = {
        shock: shock,
        var: varResult.var,
        expectedShortfall: varResult.expectedShortfall,
        stressedReturns: stressedReturns
      };
    }

    console.log('[RISK] Stress test completed for', Object.keys(results).length, 'scenarios');
    return results;
  }

  /**
   * Get risk metrics for a specific ticker
   * @param {string} ticker - Ticker symbol
   * @param {Object} options - Calculation options
   * @returns {Object} Risk metrics
   */
  getRiskMetrics(ticker, options = {}) {
    if (!this.data) {
      console.error('[RISK] No data available for risk calculation');
      return null;
    }

    // Filter data for specific ticker
    const tickerData = this.data.filter(d => d.ticker === ticker);
    if (tickerData.length === 0) {
      console.warn(`[RISK] No data found for ticker: ${ticker}`);
      return null;
    }

    const prices = tickerData.map(d => parseFloat(d.close));
    const returns = this.calculateReturns(prices);

    const {
      confidenceLevel = 0.95,
      timeHorizon = 1,
      riskFreeRate = 0.02
    } = options;

    const metrics = {
      ticker: ticker,
      volatility: this.calculateVolatility(returns),
      maxDrawdown: this.calculateMaxDrawdown(prices),
      sharpeRatio: this.calculateSharpeRatio(returns, riskFreeRate),
      historicalVaR: this.calculateHistoricalVaR(returns, confidenceLevel, timeHorizon),
      parametricVaR: this.calculateParametricVaR(returns, confidenceLevel, timeHorizon),
      monteCarloVaR: this.calculateMonteCarloVaR(returns, confidenceLevel, timeHorizon),
      returns: returns,
      prices: prices
    };

    console.log(`[RISK] Risk metrics calculated for ${ticker}`);
    return metrics;
  }

  /**
   * Get available tickers from data
   * @returns {Array} Array of ticker symbols
   */
  getAvailableTickers() {
    if (!this.data) return [];
    return [...new Set(this.data.map(d => d.ticker))].sort();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RiskManagement;
} else {
  window.RiskManagement = RiskManagement;
}
