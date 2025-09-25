# 🚀 Metro Performance Dashboard

Real-time monitoring dashboard for EchoTrail React Native build performance. Provides comprehensive insights into Metro build times, bundle sizes, memory usage, and optimization opportunities.

## ✨ Features

- **Real-time Monitoring**: Live performance data with WebSocket updates
- **Historical Tracking**: Performance trends over time with interactive charts
- **Multi-platform Support**: Android, iOS, and Web builds
- **Environment Comparison**: Development vs Production analysis
- **Bundle Analysis Integration**: Deep bundle composition analysis
- **REST API**: Programmatic access to performance data
- **Automated Benchmarking**: Run benchmarks directly from the dashboard
- **Performance Alerts**: Visual indicators for performance regressions

## 🎯 Quick Start

### Prerequisites

- Node.js 16+
- EchoTrail Metro Optimization system installed

### Installation

```bash
# Navigate to dashboard directory
cd dashboard

# Install dependencies
npm install

# Start dashboard server
npm start
```

The dashboard will be available at: http://localhost:3000

## 📊 Dashboard Overview

### Main Interface

The dashboard provides several key sections:

1. **Performance Overview**: Current averages and trends
2. **Interactive Charts**: Build time, bundle size, memory, and optimization trends
3. **Recent Builds**: Detailed table of recent build results
4. **Filters**: Time range, platform, and environment filtering

### Status Cards

- **Build Time**: Average build duration with trend indicator
- **Bundle Size**: Average bundle size with optimization suggestions
- **Memory Usage**: Peak memory consumption during builds
- **Optimization Score**: Overall optimization effectiveness (0-100)

### Performance Thresholds

| Metric | 🟢 Good | 🟡 Warning | 🔴 Critical |
|--------|---------|------------|-------------|
| Build Time | < 60s | 60-180s | > 180s |
| Bundle Size | < 2MB | 2-5MB | > 5MB |
| Memory Usage | < 1GB | 1-2GB | > 2GB |
| Optimization Score | > 80 | 60-80 | < 60 |

## 🔌 API Reference

### Performance Data

#### Get Performance Data
```bash
GET /api/performance?platform=android&environment=production&timeRange=30d&limit=100
```

#### Add Performance Data
```bash
POST /api/performance
Content-Type: application/json

{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "platform": "android",
  "environment": "production",
  "buildTime": 45000,
  "bundleSize": 2048576,
  "memoryUsage": 512000000,
  "optimizationScore": 85,
  "status": "success"
}
```

### Benchmarking

#### Run Benchmark
```bash
POST /api/benchmark
Content-Type: application/json

{
  "platform": "android",
  "environment": "production",
  "options": {
    "deep": true
  }
}
```

#### Analyze Bundle
```bash
POST /api/analyze
Content-Type: application/json

{
  "bundlePath": "/path/to/bundle.js",
  "options": {
    "platform": "android",
    "environment": "production",
    "deep": true
  }
}
```

### Statistics

#### Get Statistics
```bash
GET /api/stats?timeRange=30d
```

Response:
```json
{
  "totalBuilds": 150,
  "averages": {
    "buildTime": 62000,
    "bundleSize": 3200000,
    "memoryUsage": 800000000,
    "optimizationScore": 78
  },
  "trends": {
    "buildTime": -5.2,
    "bundleSize": 2.1,
    "memoryUsage": 0.8,
    "optimizationScore": 3.4
  },
  "platforms": {
    "android": { "count": 85 },
    "ios": { "count": 65 }
  },
  "environments": {
    "production": { "count": 90 },
    "development": { "count": 60 }
  }
}
```

## 📡 WebSocket Integration

The dashboard supports real-time updates via WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'initial-data':
      // Handle initial data load
      break;
    case 'new-data':
      // Handle new performance data
      break;
    case 'benchmark-started':
      // Handle benchmark start
      break;
    case 'benchmark-completed':
      // Handle benchmark completion
      break;
  }
};
```

## 🛠️ Development

### Running in Development Mode

```bash
# Install nodemon for auto-restart
npm install -g nodemon

# Start with auto-restart
npm run dev
```

### Testing the API

```bash
# Health check
npm run health

# Run test benchmark
npm run benchmark

# Test all endpoints
npm test
```

### Adding Custom Charts

The dashboard uses Chart.js for visualizations. To add custom charts:

1. Add chart configuration to `chartConfigs` object
2. Create canvas element in HTML
3. Initialize chart in `initializeCharts()` function
4. Update chart data in `updateCharts()` function

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `DATA_RETENTION_DAYS` | 90 | Data retention period |
| `MAX_DATA_POINTS` | 10000 | Maximum stored data points |

### Server Configuration

Edit `server.js` configuration:

```javascript
this.config = {
  port: process.env.PORT || 3000,
  dataDir: path.join(__dirname, 'data'),
  maxDataPoints: 10000,
  cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
};
```

## 📈 Integration with CI/CD

### GitHub Actions Integration

Add to your workflow:

```yaml
- name: Send Performance Data to Dashboard
  run: |
    curl -X POST http://dashboard.example.com/api/performance \
      -H 'Content-Type: application/json' \
      -d '{
        "platform": "${{ matrix.platform }}",
        "environment": "${{ matrix.environment }}",
        "buildTime": ${{ steps.benchmark.outputs.build_time }},
        "bundleSize": ${{ steps.benchmark.outputs.bundle_size }},
        "memoryUsage": ${{ steps.benchmark.outputs.memory_usage }},
        "optimizationScore": ${{ steps.benchmark.outputs.optimization_score }}
      }'
```

### Automated Benchmarking

Set up cron job for regular benchmarking:

```bash
# Run benchmark every hour
0 * * * * curl -X POST http://localhost:3000/api/benchmark \
  -H 'Content-Type: application/json' \
  -d '{"platform":"android","environment":"production"}'
```

## 🚨 Troubleshooting

### Common Issues

**Dashboard not loading:**
```bash
# Check server status
curl http://localhost:3000/health

# Check logs
node server.js

# Restart server
npm restart
```

**No data showing:**
```bash
# Check if data exists
curl http://localhost:3000/api/performance

# Add test data
curl -X POST http://localhost:3000/api/performance \
  -H 'Content-Type: application/json' \
  -d '{"platform":"android","environment":"production","buildTime":60000}'
```

**WebSocket connection issues:**
- Ensure port 3000 is not blocked
- Check browser developer console for errors
- Verify WebSocket URL is correct

**High memory usage:**
- Reduce `maxDataPoints` in configuration
- Increase cleanup frequency
- Check for memory leaks in custom code

### Performance Optimization

**Dashboard Performance:**
- Limit data points in charts (< 1000 points)
- Use pagination for large datasets
- Enable browser caching for static assets
- Consider data aggregation for long time ranges

**Server Performance:**
- Use clustering for multiple CPU cores
- Implement Redis for session storage
- Add database for persistent storage
- Use compression middleware

## 📋 Data Schema

### Performance Data Structure

```json
{
  "id": "unique-identifier",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "platform": "android|ios|web",
  "environment": "development|production",
  "buildTime": 45000,
  "bundleSize": 2048576,
  "memoryUsage": 512000000,
  "optimizationScore": 85,
  "status": "success|warning|error"
}
```

### Field Descriptions

- **id**: Unique identifier for the data point
- **timestamp**: ISO 8601 timestamp when the build occurred
- **platform**: Target platform (android, ios, web)
- **environment**: Build environment (development, production)
- **buildTime**: Build duration in milliseconds
- **bundleSize**: Bundle size in bytes
- **memoryUsage**: Peak memory usage in bytes
- **optimizationScore**: Optimization effectiveness (0-100)
- **status**: Build status (success, warning, error)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Update documentation
5. Submit pull request

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update API documentation
- Test on multiple browsers
- Ensure mobile responsiveness

## 📄 License

MIT License - see LICENSE file for details.

## 📞 Support

- **GitHub Issues**: Report bugs and request features
- **Documentation**: See main Metro Optimization Guide
- **Slack**: `#metro-optimization` channel
- **Email**: metro-support@echotrail.com

---

*Metro Performance Dashboard v2.0 - Part of the EchoTrail Metro Optimization Suite*