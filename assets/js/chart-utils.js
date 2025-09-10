/**
 * Chart Utilities for DeepAries Dashboard
 * Reusable chart components and utilities
 */

class ChartUtils {
  constructor() {
    this.defaultColors = {
      primary: '#2563eb',
      secondary: '#dc2626',
      success: '#16a34a',
      warning: '#d97706',
      info: '#0891b2',
      light: '#6b7280',
      dark: '#374151'
    };
  }

  /**
   * Create a time series chart with technical indicators
   * @param {string} containerId - DOM element ID
   * @param {Array} data - Chart data
   * @param {Object} options - Chart options
   */
  createTimeSeriesChart(containerId, data, options = {}) {
    const element = document.getElementById(containerId);
    if (!element) {
      console.error(`[CHART] Container ${containerId} not found`);
      return;
    }

    const {
      title = 'Time Series Chart',
      xAxisTitle = 'Date',
      yAxisTitle = 'Price',
      showLegend = true,
      height = 400,
      indicators = []
    } = options;

    const traces = [];
    
    // Main price line
    if (data.prices && data.dates) {
      traces.push({
        x: data.dates,
        y: data.prices,
        type: 'scatter',
        mode: 'lines',
        name: 'Price',
        line: { color: this.defaultColors.primary, width: 2 },
        hovertemplate: '<b>Price</b><br>' +
                      'Date: %{x}<br>' +
                      'Price: $%{y:,.2f}<br>' +
                      '<extra></extra>'
      });
    }

    // Add technical indicators
    indicators.forEach(indicator => {
      if (indicator.data && indicator.data.length > 0) {
        traces.push({
          x: data.dates.slice(-indicator.data.length),
          y: indicator.data,
          type: 'scatter',
          mode: 'lines',
          name: indicator.name,
          line: { color: indicator.color || this.defaultColors.secondary, width: 1 },
          yaxis: indicator.yaxis || 'y',
          hovertemplate: `<b>${indicator.name}</b><br>` +
                        'Date: %{x}<br>' +
                        'Value: %{y:,.2f}<br>' +
                        '<extra></extra>'
        });
      }
    });

    const layout = {
      title: {
        text: title,
        font: { size: 16 }
      },
      xaxis: {
        title: xAxisTitle,
        type: 'date',
        tickformat: '%Y-%m-%d'
      },
      yaxis: {
        title: yAxisTitle,
        tickformat: '$,.0f'
      },
      showlegend: showLegend,
      height: height,
      margin: { t: 40, r: 10, b: 40, l: 50 },
      hovermode: 'x unified'
    };

    // Add secondary y-axis if needed
    if (indicators.some(ind => ind.yaxis === 'y2')) {
      layout.yaxis2 = {
        title: 'Indicator Value',
        overlaying: 'y',
        side: 'right',
        tickformat: '.2f'
      };
    }

    Plotly.newPlot(containerId, traces, layout, { responsive: true });
  }

  /**
   * Create a candlestick chart
   * @param {string} containerId - DOM element ID
   * @param {Array} data - OHLC data
   * @param {Object} options - Chart options
   */
  createCandlestickChart(containerId, data, options = {}) {
    const element = document.getElementById(containerId);
    if (!element) {
      console.error(`[CHART] Container ${containerId} not found`);
      return;
    }

    const {
      title = 'Candlestick Chart',
      showVolume = true,
      height = 500
    } = options;

    const traces = [];

    // Candlestick trace
    if (data.ohlc && data.dates) {
      traces.push({
        x: data.dates,
        open: data.ohlc.map(d => d.open),
        high: data.ohlc.map(d => d.high),
        low: data.ohlc.map(d => d.low),
        close: data.ohlc.map(d => d.close),
        type: 'candlestick',
        name: 'Price',
        increasing: { line: { color: this.defaultColors.success } },
        decreasing: { line: { color: this.defaultColors.secondary } }
      });
    }

    // Volume trace
    if (showVolume && data.volume && data.dates) {
      traces.push({
        x: data.dates,
        y: data.volume,
        type: 'bar',
        name: 'Volume',
        yaxis: 'y2',
        marker: { color: this.defaultColors.light, opacity: 0.7 }
      });
    }

    const layout = {
      title: {
        text: title,
        font: { size: 16 }
      },
      xaxis: {
        title: 'Date',
        type: 'date',
        rangeslider: { visible: false }
      },
      yaxis: {
        title: 'Price',
        tickformat: '$,.0f'
      },
      yaxis2: {
        title: 'Volume',
        overlaying: 'y',
        side: 'right',
        tickformat: ',.0f'
      },
      height: height,
      margin: { t: 40, r: 60, b: 40, l: 50 },
      showlegend: true
    };

    Plotly.newPlot(containerId, traces, layout, { responsive: true });
    console.log(`[CHART] Candlestick chart created: ${containerId}`);
  }

  /**
   * Create a correlation heatmap
   * @param {string} containerId - DOM element ID
   * @param {Array} data - Correlation matrix data
   * @param {Object} options - Chart options
   */
  createCorrelationHeatmap(containerId, data, options = {}) {
    const element = document.getElementById(containerId);
    if (!element) {
      console.error(`[CHART] Container ${containerId} not found`);
      return;
    }

    const {
      title = 'Correlation Matrix',
      tickers = [],
      height = 400
    } = options;

    const trace = {
      z: data,
      x: tickers,
      y: tickers,
      type: 'heatmap',
      colorscale: [
        [0, '#dc2626'],
        [0.5, '#ffffff'],
        [1, '#16a34a']
      ],
      zmid: 0,
      colorbar: {
        title: 'Correlation',
        titleside: 'right'
      },
      hovertemplate: '<b>%{y} vs %{x}</b><br>' +
                    'Correlation: %{z:.3f}<br>' +
                    '<extra></extra>'
    };

    const layout = {
      title: {
        text: title,
        font: { size: 16 }
      },
      xaxis: {
        title: 'Tickers',
        tickangle: 45
      },
      yaxis: {
        title: 'Tickers'
      },
      height: height,
      margin: { t: 40, r: 10, b: 60, l: 60 }
    };

    Plotly.newPlot(containerId, [trace], layout, { responsive: true });
    console.log(`[CHART] Correlation heatmap created: ${containerId}`);
  }

  /**
   * Create a risk-return scatter plot
   * @param {string} containerId - DOM element ID
   * @param {Array} data - Risk-return data
   * @param {Object} options - Chart options
   */
  createRiskReturnChart(containerId, data, options = {}) {
    const element = document.getElementById(containerId);
    if (!element) {
      console.error(`[CHART] Container ${containerId} not found`);
      return;
    }

    const {
      title = 'Risk-Return Analysis',
      height = 400
    } = options;

    const trace = {
      x: data.map(d => d.risk),
      y: data.map(d => d.return),
      mode: 'markers+text',
      type: 'scatter',
      text: data.map(d => d.ticker),
      textposition: 'top center',
      marker: {
        size: 10,
        color: this.defaultColors.primary,
        opacity: 0.7
      },
      hovertemplate: '<b>%{text}</b><br>' +
                    'Risk: %{x:.2%}<br>' +
                    'Return: %{y:.2%}<br>' +
                    '<extra></extra>'
    };

    const layout = {
      title: {
        text: title,
        font: { size: 16 }
      },
      xaxis: {
        title: 'Risk (Volatility)',
        tickformat: '.1%'
      },
      yaxis: {
        title: 'Expected Return',
        tickformat: '.1%'
      },
      height: height,
      margin: { t: 40, r: 10, b: 40, l: 50 }
    };

    Plotly.newPlot(containerId, [trace], layout, { responsive: true });
    console.log(`[CHART] Risk-return chart created: ${containerId}`);
  }

  /**
   * Create a VaR distribution chart
   * @param {string} containerId - DOM element ID
   * @param {Array} returns - Historical returns
   * @param {Object} options - Chart options
   */
  createVaRChart(containerId, returns, options = {}) {
    const element = document.getElementById(containerId);
    if (!element) {
      console.error(`[CHART] Container ${containerId} not found`);
      return;
    }

    const {
      title = 'VaR Distribution',
      confidenceLevel = 0.95,
      height = 400
    } = options;

    // Calculate VaR
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    const varValue = sortedReturns[varIndex];

    // Create histogram
    const trace1 = {
      x: returns,
      type: 'histogram',
      name: 'Returns Distribution',
      marker: { color: this.defaultColors.light, opacity: 0.7 },
      nbinsx: 50
    };

    // Add VaR line
    const trace2 = {
      x: [varValue, varValue],
      y: [0, Math.max(...returns)],
      type: 'scatter',
      mode: 'lines',
      name: `VaR (${(confidenceLevel * 100).toFixed(0)}%)`,
      line: { color: this.defaultColors.secondary, width: 3, dash: 'dash' }
    };

    const layout = {
      title: {
        text: title,
        font: { size: 16 }
      },
      xaxis: {
        title: 'Returns',
        tickformat: '.2%'
      },
      yaxis: {
        title: 'Frequency'
      },
      height: height,
      margin: { t: 40, r: 10, b: 40, l: 50 },
      showlegend: true
    };

    Plotly.newPlot(containerId, [trace1, trace2], layout, { responsive: true });
    console.log(`[CHART] VaR chart created: ${containerId}, VaR: ${(varValue * 100).toFixed(2)}%`);
  }

  /**
   * Resize all charts in a container
   * @param {string} containerId - Container ID (optional)
   */
  resizeCharts(containerId = null) {
    const charts = containerId ? 
      document.querySelectorAll(`#${containerId} .chart-container > div[id]`) :
      document.querySelectorAll('.chart-container > div[id]');

    charts.forEach(chart => {
      if (window.Plotly && Plotly.Plots?.resize) {
        try {
          Plotly.Plots.resize(chart);
          console.log(`[CHART] Resized chart: ${chart.id}`);
        } catch (error) {
          console.warn(`[CHART] Failed to resize chart ${chart.id}:`, error.message);
        }
      }
    });
  }

  /**
   * Clear a chart
   * @param {string} containerId - Chart container ID
   */
  clearChart(containerId) {
    const element = document.getElementById(containerId);
    if (element && window.Plotly) {
      Plotly.purge(containerId);
      console.log(`[CHART] Cleared chart: ${containerId}`);
    }
  }

  /**
   * Create a volume analysis chart
   * @param {string} containerId - DOM element ID
   * @param {Object} data - Volume data {dates, volumes, prices}
   * @param {Object} options - Chart options
   */
  createVolumeChart(containerId, data, options = {}) {
    const element = document.getElementById(containerId);
    if (!element) {
      console.error(`[CHART] Container ${containerId} not found`);
      return;
    }

    const { dates, volumes, prices } = data;
    const title = options.title || 'Volume Analysis';
    const height = options.height || 400;

    // Create volume bars
    const volumeTrace = {
      x: dates,
      y: volumes,
      type: 'bar',
      name: 'Volume',
      marker: {
        color: volumes.map((vol, i) => {
          // Color bars based on price movement
          if (i === 0) return this.defaultColors.light;
          return prices[i] >= prices[i-1] ? this.defaultColors.success : this.defaultColors.secondary;
        }),
        opacity: 0.7
      },
      yaxis: 'y2'
    };

    // Create price line
    const priceTrace = {
      x: dates,
      y: prices,
      type: 'scatter',
      mode: 'lines',
      name: 'Price',
      line: {
        color: this.defaultColors.primary,
        width: 2
      },
      yaxis: 'y'
    };

    const layout = {
      title: {
        text: title,
        font: { size: 16 }
      },
      xaxis: {
        title: 'Date',
        type: 'date'
      },
      yaxis: {
        title: 'Price',
        side: 'left',
        showgrid: true
      },
      yaxis2: {
        title: 'Volume',
        side: 'right',
        overlaying: 'y',
        showgrid: false
      },
      height: height,
      margin: { t: 40, r: 60, b: 40, l: 50 },
      showlegend: true,
      legend: {
        x: 0,
        y: 1,
        bgcolor: 'rgba(255,255,255,0.8)'
      }
    };

    Plotly.newPlot(containerId, [priceTrace, volumeTrace], layout, { responsive: true });
    console.log(`[CHART] Volume chart rendered in ${containerId}`);
  }

  /**
   * Create a VaR distribution chart
   * @param {string} containerId - DOM element ID
   * @param {Array} returns - Array of returns
   * @param {Object} options - Chart options
   */
  createVaRChart(containerId, returns, options = {}) {
    const element = document.getElementById(containerId);
    if (!element) {
      console.error(`[CHART] Container ${containerId} not found`);
      return;
    }

    const title = options.title || 'VaR Distribution';
    const confidenceLevel = options.confidenceLevel || 0.95;
    const height = options.height || 400;

    // Calculate VaR
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    const varValue = sortedReturns[varIndex];

    const trace = {
      x: returns,
      type: 'histogram',
      name: 'Returns Distribution',
      marker: {
        color: this.defaultColors.primary,
        opacity: 0.7
      },
      nbinsx: 30
    };

    // Add VaR line
    const varLine = {
      x: [varValue, varValue],
      y: [0, Math.max(...returns)],
      type: 'scatter',
      mode: 'lines',
      name: `VaR ${(confidenceLevel * 100).toFixed(0)}%`,
      line: {
        color: this.defaultColors.secondary,
        width: 3,
        dash: 'dash'
      }
    };

    const layout = {
      title: {
        text: title,
        font: { size: 16 }
      },
      xaxis: {
        title: 'Returns',
        tickformat: '.2%'
      },
      yaxis: {
        title: 'Frequency'
      },
      height: height,
      margin: { t: 40, r: 10, b: 40, l: 50 },
      showlegend: true
    };

    Plotly.newPlot(containerId, [trace, varLine], layout, { responsive: true });
    console.log(`[CHART] VaR chart rendered in ${containerId}`);
  }

  /**
   * Create a correlation heatmap
   * @param {string} containerId - DOM element ID
   * @param {Array} correlationMatrix - 2D correlation matrix
   * @param {Object} options - Chart options
   */
  createCorrelationHeatmap(containerId, correlationMatrix, options = {}) {
    const element = document.getElementById(containerId);
    if (!element) {
      console.error(`[CHART] Container ${containerId} not found`);
      return;
    }

    const title = options.title || 'Correlation Matrix';
    const tickers = options.tickers || [];
    const height = options.height || 400;

    const trace = {
      z: correlationMatrix,
      x: tickers,
      y: tickers,
      type: 'heatmap',
      colorscale: [
        [0, this.defaultColors.secondary],
        [0.5, '#ffffff'],
        [1, this.defaultColors.success]
      ],
      showscale: true,
      colorbar: {
        title: 'Correlation'
      }
    };

    const layout = {
      title: {
        text: title,
        font: { size: 16 }
      },
      height: height,
      margin: { t: 40, r: 10, b: 40, l: 50 }
    };

    Plotly.newPlot(containerId, [trace], layout, { responsive: true });
    console.log(`[CHART] Correlation heatmap rendered in ${containerId}`);
  }

  /**
   * Get default color by index
   * @param {number} index - Color index
   * @returns {string} Color value
   */
  getColor(index) {
    const colors = Object.values(this.defaultColors);
    return colors[index % colors.length];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChartUtils;
} else {
  window.ChartUtils = ChartUtils;
}
