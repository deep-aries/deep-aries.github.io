/**
 * Advanced Features for Deep Aries Stock Dashboard
 * Technical Analysis, Portfolio Optimization, Risk Management, News Analysis
 */

class AdvancedFeatures {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.technicalIndicators = new TechnicalAnalysis();
    this.portfolioOptimizer = new PortfolioOptimizer();
    this.riskManager = new RiskManager();
    this.newsAnalyzer = new NewsAnalyzer();
  }

  // Technical Analysis Methods
  calculateSMA(data, period) {
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  calculateEMA(data, period) {
    const ema = [];
    const multiplier = 2 / (period + 1);
    ema[0] = data[0];
    
    for (let i = 1; i < data.length; i++) {
      ema[i] = (data[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
    }
    return ema;
  }

  calculateRSI(data, period = 14) {
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const rsi = [];
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
    
    return rsi;
  }

  calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    const histogram = macdLine.map((macd, i) => macd - signalLine[i]);
    
    return { macdLine, signalLine, histogram };
  }

  calculateBollingerBands(data, period = 20, stdDev = 2) {
    const sma = this.calculateSMA(data, period);
    const bands = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i - period + 1];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      bands.push({
        upper: mean + (stdDev * standardDeviation),
        middle: mean,
        lower: mean - (stdDev * standardDeviation)
      });
    }
    
    return bands;
  }

  // Portfolio Optimization Methods
  calculatePortfolioMetrics(returns, weights) {
    const portfolioReturn = returns.reduce((sum, ret, i) => sum + (ret * weights[i]), 0);
    const portfolioVariance = this.calculatePortfolioVariance(returns, weights);
    const portfolioStdDev = Math.sqrt(portfolioVariance);
    const sharpeRatio = portfolioReturn / portfolioStdDev;
    
    return {
      return: portfolioReturn,
      volatility: portfolioStdDev,
      sharpeRatio: sharpeRatio
    };
  }

  calculatePortfolioVariance(returns, weights) {
    // Simplified calculation - in practice, you'd use covariance matrix
    const weightedReturns = returns.map((ret, i) => ret * weights[i]);
    const mean = weightedReturns.reduce((sum, val) => sum + val, 0) / weightedReturns.length;
    const variance = weightedReturns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / weightedReturns.length;
    return variance;
  }

  optimizePortfolio(returns, targetReturn = 0.1) {
    // Simplified Markowitz optimization
    const n = returns.length;
    const weights = new Array(n).fill(1 / n); // Equal weights as starting point
    
    // This is a simplified version - real optimization would use quadratic programming
    const metrics = this.calculatePortfolioMetrics(returns, weights);
    
    return {
      weights: weights,
      expectedReturn: metrics.return,
      volatility: metrics.volatility,
      sharpeRatio: metrics.sharpeRatio
    };
  }

  // Risk Management Methods
  calculateVaR(returns, confidence = 0.95) {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sortedReturns.length);
    return Math.abs(sortedReturns[index]);
  }

  calculateExpectedShortfall(returns, confidence = 0.95) {
    const varValue = this.calculateVaR(returns, confidence);
    const tailReturns = returns.filter(ret => ret <= -varValue);
    return tailReturns.reduce((sum, ret) => sum + Math.abs(ret), 0) / tailReturns.length;
  }

  calculateBeta(assetReturns, marketReturns) {
    const n = Math.min(assetReturns.length, marketReturns.length);
    const assetSlice = assetReturns.slice(-n);
    const marketSlice = marketReturns.slice(-n);
    
    const assetMean = assetSlice.reduce((sum, val) => sum + val, 0) / n;
    const marketMean = marketSlice.reduce((sum, val) => sum + val, 0) / n;
    
    let covariance = 0;
    let marketVariance = 0;
    
    for (let i = 0; i < n; i++) {
      const assetDiff = assetSlice[i] - assetMean;
      const marketDiff = marketSlice[i] - marketMean;
      covariance += assetDiff * marketDiff;
      marketVariance += marketDiff * marketDiff;
    }
    
    return covariance / marketVariance;
  }

  // News Analysis Methods (Mock implementation)
  analyzeNewsSentiment(newsData) {
    // This would typically use NLP APIs or pre-trained models
    const sentiments = newsData.map(news => ({
      ...news,
      sentiment: this.mockSentimentAnalysis(news.title + ' ' + news.content),
      confidence: Math.random() * 0.4 + 0.6 // 60-100% confidence
    }));
    
    return sentiments;
  }

  mockSentimentAnalysis(text) {
    const positiveWords = ['상승', '긍정', '호재', '성장', '수익', '개선', '증가'];
    const negativeWords = ['하락', '부정', '악재', '손실', '감소', '악화', '위험'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  // Export Methods
  exportToCSV(data, filename) {
    const csv = this.convertToCSV(data);
    this.downloadFile(csv, filename, 'text/csv');
  }

  exportToJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    this.downloadFile(json, filename, 'application/json');
  }

  convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');
    
    return csvContent;
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Utility Methods
  formatNumber(num, decimals = 2) {
    return num.toFixed(decimals);
  }

  formatPercentage(num, decimals = 2) {
    return (num * 100).toFixed(decimals) + '%';
  }

  formatCurrency(num, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(num);
  }
}

// Technical Analysis Class
class TechnicalAnalysis {
  constructor() {
    this.indicators = {
      SMA: this.calculateSMA,
      EMA: this.calculateEMA,
      RSI: this.calculateRSI,
      MACD: this.calculateMACD,
      Bollinger: this.calculateBollingerBands
    };
  }

  calculateSMA(data, period) {
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  calculateEMA(data, period) {
    const ema = [];
    const multiplier = 2 / (period + 1);
    ema[0] = data[0];
    
    for (let i = 1; i < data.length; i++) {
      ema[i] = (data[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
    }
    return ema;
  }

  calculateRSI(data, period = 14) {
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const rsi = [];
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
    
    return rsi;
  }

  calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    const histogram = macdLine.map((macd, i) => macd - signalLine[i]);
    
    return { macdLine, signalLine, histogram };
  }

  calculateBollingerBands(data, period = 20, stdDev = 2) {
    const sma = this.calculateSMA(data, period);
    const bands = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i - period + 1];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      bands.push({
        upper: mean + (stdDev * standardDeviation),
        middle: mean,
        lower: mean - (stdDev * standardDeviation)
      });
    }
    
    return bands;
  }
}

// Portfolio Optimizer Class
class PortfolioOptimizer {
  constructor() {
    this.riskFreeRate = 0.02; // 2% risk-free rate
  }

  calculateSharpeRatio(returns, weights) {
    const portfolioReturn = returns.reduce((sum, ret, i) => sum + (ret * weights[i]), 0);
    const portfolioStdDev = this.calculatePortfolioStdDev(returns, weights);
    return (portfolioReturn - this.riskFreeRate) / portfolioStdDev;
  }

  calculatePortfolioStdDev(returns, weights) {
    // Simplified calculation
    const weightedReturns = returns.map((ret, i) => ret * weights[i]);
    const mean = weightedReturns.reduce((sum, val) => sum + val, 0) / weightedReturns.length;
    const variance = weightedReturns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / weightedReturns.length;
    return Math.sqrt(variance);
  }

  optimizePortfolio(returns, targetReturn = 0.1) {
    // Simplified optimization - equal weights for now
    const n = returns.length;
    const weights = new Array(n).fill(1 / n);
    
    return {
      weights: weights,
      expectedReturn: this.calculateExpectedReturn(returns, weights),
      volatility: this.calculatePortfolioStdDev(returns, weights),
      sharpeRatio: this.calculateSharpeRatio(returns, weights)
    };
  }

  calculateExpectedReturn(returns, weights) {
    return returns.reduce((sum, ret, i) => sum + (ret * weights[i]), 0);
  }
}

// Risk Manager Class
class RiskManager {
  calculateVaR(returns, confidence = 0.95) {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sortedReturns.length);
    return Math.abs(sortedReturns[index]);
  }

  calculateExpectedShortfall(returns, confidence = 0.95) {
    const varValue = this.calculateVaR(returns, confidence);
    const tailReturns = returns.filter(ret => ret <= -varValue);
    return tailReturns.reduce((sum, ret) => sum + Math.abs(ret), 0) / tailReturns.length;
  }

  calculateMaxDrawdown(returns) {
    let peak = returns[0];
    let maxDrawdown = 0;
    
    for (let i = 1; i < returns.length; i++) {
      if (returns[i] > peak) {
        peak = returns[i];
      }
      const drawdown = (peak - returns[i]) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown;
  }
}

// News Analyzer Class
class NewsAnalyzer {
  constructor() {
    this.sentimentKeywords = {
      positive: ['상승', '긍정', '호재', '성장', '수익', '개선', '증가', 'bullish', 'positive', 'growth'],
      negative: ['하락', '부정', '악재', '손실', '감소', '악화', '위험', 'bearish', 'negative', 'decline']
    };
  }

  analyzeSentiment(text) {
    const lowerText = text.toLowerCase();
    const positiveCount = this.sentimentKeywords.positive.filter(word => lowerText.includes(word)).length;
    const negativeCount = this.sentimentKeywords.negative.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return { sentiment: 'positive', score: positiveCount / (positiveCount + negativeCount) };
    if (negativeCount > positiveCount) return { sentiment: 'negative', score: negativeCount / (positiveCount + negativeCount) };
    return { sentiment: 'neutral', score: 0.5 };
  }

  generateMockNews() {
    const mockNews = [
      {
        title: "주식시장 긍정적 전망 발표",
        content: "전문가들이 내년 주식시장에 대해 긍정적인 전망을 발표했습니다.",
        date: new Date().toISOString(),
        source: "Financial News"
      },
      {
        title: "경제지표 개선세 지속",
        content: "최근 경제지표들이 지속적인 개선세를 보이고 있습니다.",
        date: new Date(Date.now() - 86400000).toISOString(),
        source: "Market Watch"
      },
      {
        title: "투자자 신뢰도 상승",
        content: "투자자들의 시장에 대한 신뢰도가 크게 상승했습니다.",
        date: new Date(Date.now() - 172800000).toISOString(),
        source: "Investment Daily"
      }
    ];
    
    return mockNews.map(news => ({
      ...news,
      sentiment: this.analyzeSentiment(news.title + ' ' + news.content)
    }));
  }
}
