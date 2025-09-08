# Deep Aries - Academic Research Demo

🔬 Academic Research Demonstration of AI-Powered Financial Market Analysis and Portfolio Optimization

## 🌐 Live Demo

- **GitHub Pages**: https://deep-aries.github.io/

## 📊 Research Features

### 🎯 Core Research Components
- **Real-time Market Data Visualization**: Interactive time series charts for stock price analysis
- **AI Prediction Heatmaps**: Deep learning model predictions for future price movements
- **Portfolio Performance Analysis**: Comparative analysis of different model performances
- **Responsive Academic Interface**: Mobile/desktop optimized research demonstration
- **Static Site Architecture**: GitHub Pages hosting for academic accessibility

### 🔍 Advanced Analytical Tools
- **Technical Indicators**: SMA, EMA, RSI, MACD, Bollinger Bands implementation
- **Candlestick Charts**: OHLC data visualization for market analysis
- **Volume Analysis**: Trading volume pattern recognition and analysis
- **Correlation Matrix**: Inter-asset correlation analysis and visualization

### 💼 Portfolio Optimization Research
- **Enhanced Markowitz Optimization**: Advanced portfolio optimization algorithms
- **Performance Metrics**: Sharpe ratio, maximum drawdown, volatility analysis
- **Asset Allocation Visualization**: Interactive portfolio allocation charts
- **Dynamic Rebalancing**: Automated rebalancing strategies and backtesting

### ⚠️ Risk Management Research
- **VaR Analysis**: Value at Risk calculation and visualization
- **Stress Testing**: Scenario-based risk analysis and stress testing
- **Risk Metrics**: Beta, Alpha, Information Ratio, Treynor Ratio calculations
- **Expected Shortfall**: Conditional VaR and tail risk analysis

### 📰 Sentiment Analysis Research
- **News Sentiment Analysis**: AI-powered news sentiment classification
- **Social Media Analysis**: Twitter, Reddit sentiment integration
- **Real-time News Feed**: Latest market news with sentiment scoring
- **Multi-modal Sentiment**: Combined text and market data sentiment analysis

### 📱 Progressive Web App Features
- **Offline Capability**: Service Worker-based caching for research continuity
- **App Installation**: Home screen installation for mobile research access
- **Push Notifications**: Research alerts and data update notifications
- **Background Synchronization**: Automatic data synchronization and updates

### 📊 Data Management & Export
- **CSV Export**: Complete dataset export for further analysis
- **JSON Export**: Structured data export for research integration
- **Fullscreen Mode**: Enhanced chart viewing for detailed analysis
- **User Preferences**: Personalized research dashboard configuration

## 🛠️ Research Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Visualization**: Plotly.js for interactive charts
- **Data Processing**: PapaParse for CSV data parsing
- **Hosting**: GitHub Pages for academic accessibility
- **Architecture**: Static site with PWA capabilities

## 📁 Project Structure

```
deep-aries.github.io/
├── index.html                    # Main research demonstration page
├── _config.yml                  # Jekyll configuration
├── manifest.json                # PWA manifest for mobile access
├── sw.js                        # Service Worker for offline capability
├── assets/
│   ├── css/
│   │   └── style.css            # Academic styling and responsive design
│   ├── js/
│   │   ├── dashboard.js         # Main research dashboard logic
│   │   └── advanced-features.js # Advanced analytical modules
│   └── icons/
│       ├── icon-192x192.png     # PWA icon (192px)
│       └── icon-512x512.png     # PWA icon (512px)
└── data/
    ├── market.csv               # Current market data
    ├── market_past.csv          # Historical market data
    ├── future.csv               # AI model predictions
    ├── result.csv               # Portfolio optimization results
    └── test.csv                 # Test dataset for validation
```

## 🚀 Research Deployment

### GitHub Pages Academic Hosting

1. **Repository Configuration**:
   - Settings → Pages → Source: Deploy from a branch
   - Branch: main, Folder: / (root)




2. **Automatic Deployment**:
   - Push to main branch triggers automatic deployment
   - Deployment status available in Actions tab
   - Accessible at: https://deep-aries.github.io/

### Local Research Environment

```bash
# Clone repository
git clone https://github.com/deep-aries/deep-aries.github.io.git
cd deep-aries.github.io

# Start local server (Python)
python -m http.server 8000

# Access in browser
open http://localhost:8000
```

## 📈 Research Data Format

### Market Data (market.csv, market_past.csv)
```csv
date,ticker,market,open,close,high,low,adjclose,volume,zadjcp
2025-02-28 00:00:00+08:00,600519.SS,csi300,1485.5,1500.79,1528.38,1482,1500.79,5612895,1
```

### AI Model Predictions (future.csv)
```csv
Ticker,2025-01-03,2025-01-04,2025-01-05,...
AAPL,87.45,145.07,123.20,...
MSFT,111.19,63.95,79.21,...
```

### Portfolio Optimization Results (result.csv)
```csv
date,model,market,ticker,pred_len,top_5_portfolio,least_5_portfolio,portfolio_ratio,Final Portfolio Value
2021-01-03,Autoformer,csi300,ALL,0,,,{},1
```

## 🔧 Research Configuration

### Jekyll Configuration (_config.yml)
```yaml
title: "Deep Aries - Academic Research Demo"
description: "Academic research demonstration of AI-powered financial market analysis and portfolio optimization"
baseurl: ""
url: "https://deep-aries.github.io"
```

## 📱 Responsive Academic Interface

- **Desktop**: 2-column grid layout for comprehensive analysis
- **Tablet**: Single-column layout with touch optimization
- **Mobile**: Vertical scroll with touch-friendly controls

## 🎨 Research Interface Features

- **Academic Design**: Clean, professional card-based layout
- **Interactive Visualizations**: Plotly.js-based dynamic charts
- **Loading States**: Enhanced user experience during data processing
- **Error Handling**: User-friendly error messages and recovery
- **Accessibility**: Keyboard navigation and semantic HTML support

## 🔄 Research Data Updates

Data updates follow this workflow:

1. Update CSV files with new research data
2. Commit and push changes to Git
3. Automatic GitHub Pages deployment
4. Immediate availability at research demo URL

## 📞 Research Contact

- **GitHub Issues**: [Report bugs or request research features](https://github.com/deep-aries/deep-aries.github.io/issues)
- **Research Inquiries**: [Contact Research Team](mailto:research@deeparies.com)

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 📚 Related Publications

This demonstration accompanies our research paper:
**"Deep Learning Approaches for Financial Market Analysis and Portfolio Optimization"**

*Authors: Deep Aries Research Team*  
*Institution: [Your Institution]*  
*Year: 2025*

---

© 2025 Deep Aries Research. All rights reserved.