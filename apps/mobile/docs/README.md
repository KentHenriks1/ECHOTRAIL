# Mobile App Documentation

This directory contains comprehensive documentation for the EchoTrail mobile application.

## 📚 Documentation Overview

### 🎯 Metro Optimization System

Enterprise-grade tooling for React Native build performance:

| Document | Description | Audience |
|----------|-------------|----------|
| **[Metro Optimization Guide](METRO_OPTIMIZATION_GUIDE.md)** | Complete documentation with setup, usage, and advanced topics | All developers |
| **[Quick Reference](METRO_QUICK_REFERENCE.md)** | Cheat sheet with commands and common solutions | Daily development |

### 🎨 UX & Design

*Coming soon: Skjermflyt, UX-prinsipper, figma-lenker, a11y-prinsipper.*

## 🚀 Quick Start

### Metro Optimization
```bash
# Run performance benchmark
npm run metro:benchmark:report

# Analyze bundle composition  
node scripts/analyze-metro-bundle.js bundle.js

# Clear cache if issues
npm run metro:clean
```

### Performance Standards
| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Build Time | < 60s | 60-180s | > 180s |
| Bundle Size | < 2MB | 2-5MB | > 5MB |
| Memory Usage | < 1GB | 1-2GB | > 2GB |

## 📋 Documentation Index

### Metro Optimization
- [Complete Guide](METRO_OPTIMIZATION_GUIDE.md) - Full system documentation
- [Quick Reference](METRO_QUICK_REFERENCE.md) - Commands and troubleshooting

### Configuration
- [Metro Config](../metro.config.js) - Optimized bundler configuration
- [GitHub Actions](../.github/workflows/metro-optimization-analysis.yml) - CI/CD workflow

### Tools & Scripts
- [Benchmarking](../scripts/run-metro-benchmarks.js) - Performance measurement
- [Bundle Analysis](../scripts/analyze-metro-bundle.js) - Bundle composition analysis

## 🆘 Support

- **Metro Optimization**: See [troubleshooting guide](METRO_OPTIMIZATION_GUIDE.md#troubleshooting)
- **Slack**: `#metro-optimization` channel
- **Issues**: GitHub issue tracker

---

*Last updated: January 2024*
