# Metro Optimization Quick Reference

## 🚀 Quick Commands

### Benchmarking
```bash
# Basic benchmark
npm run metro:benchmark

# Detailed report with recommendations
npm run metro:benchmark:report

# Historical trends (last 30 days)
npm run metro:benchmark:trends 30

# CI-compatible benchmark
npm run metro:benchmark:ci

# Platform-specific benchmark
npm run metro:benchmark:android
```

### Bundle Analysis
```bash
# Analyze existing bundle
node scripts/analyze-metro-bundle.js bundle.js

# Generate HTML report
node scripts/analyze-metro-bundle.js bundle.js --format html --export report.html

# Deep analysis with security scan
node scripts/analyze-metro-bundle.js bundle.js --deep

# Platform-specific analysis
node scripts/analyze-metro-bundle.js bundle.js --platform ios --environment production
```

### Maintenance
```bash
# Clear Metro cache
npm run metro:clean

# Reset Metro and clear cache
npm run metro:reset

# Test Metro configuration
npm run metro:validate
```

---

## 📊 Performance Thresholds

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Build Time | < 60s | 60-180s | > 180s |
| Bundle Size | < 2MB | 2-5MB | > 5MB |
| Memory Usage | < 1GB | 1-2GB | > 2GB |
| Optimization Score | > 80 | 60-80 | < 60 |

---

## 🎯 Common Optimizations

### Bundle Size Reduction
1. **Enable tree shaking** in metro.config.js
2. **Remove unused dependencies**: Run `npm run deps:unused`
3. **Replace heavy libraries**: moment.js → date-fns, lodash → native methods
4. **Implement code splitting**: Use `React.lazy()` for large components
5. **Optimize assets**: Compress images, use WebP format

### Build Performance
1. **Enable Metro caching**: Configure `cacheStores` in metro.config.js
2. **Limit worker processes**: Set `maxWorkers = Math.min(4, cpus().length)`
3. **Optimize file watching**: Configure `watchFolders` for monorepos
4. **Use Hermes**: Enable Hermes for Android builds

### Memory Optimization
1. **Lazy load modules**: Use dynamic imports
2. **Optimize images**: Use appropriate formats and sizes
3. **Clean up listeners**: Remove event listeners properly
4. **Profile memory usage**: Use Chrome DevTools

---

## ⚙️ Metro Config Essentials

### Production Optimizations
```javascript
// metro.config.js - Production settings
if (process.env.NODE_ENV === 'production') {
  config.transformer.minifierConfig = {
    compress: {
      drop_console: true,
      drop_debugger: true,
      dead_code: true,
    },
  };
}
```

### Platform-Specific Settings
```javascript
// Android optimizations
config.transformer.unstable_transformProfile = 'hermes-stable';

// iOS optimizations
config.transformer.unstable_disableES6Transforms = true;
```

---

## 📈 CI/CD Integration

### GitHub Actions
- Workflow file: `.github/workflows/metro-optimization-analysis.yml`
- Triggers: PR, main branch, manual
- Features: Multi-platform analysis, regression detection, PR comments

### Performance Thresholds (CI)
```yaml
MAX_BUILD_TIME=300000      # 5 minutes
MAX_BUNDLE_SIZE=10485760   # 10MB  
MIN_OPTIMIZATION_SCORE=70  # 70/100
```

---

## 🔍 Bundle Analysis Report Sections

1. **Executive Summary**: Key metrics overview
2. **Bundle Composition**: Module distribution
3. **Dependencies**: Heavy/unused packages
4. **Optimizations**: Tree shaking, dead code
5. **Performance Impact**: Loading times, memory
6. **Security Analysis**: Vulnerabilities, secrets
7. **Recommendations**: Prioritized action items

---

## 🛠️ Troubleshooting

### Common Issues

**Build too slow?**
```bash
npm run metro:clean && npm run metro:reset
npx metro doctor
```

**Bundle file not found?**
```bash
find . -name "*.js" -path "*/build/*" -o -path "*/dist/*"
npx react-native bundle --platform android --dev false
```

**Analysis reports empty?**
```bash
# Check bundle format
file bundle.js
head -n 10 bundle.js

# Try different options
node scripts/analyze-metro-bundle.js bundle.js --deep --format json
```

**High memory usage?**
```bash
# Limit workers in metro.config.js
config.maxWorkers = Math.min(4, require('os').cpus().length);

# Increase Node.js memory
node --max-old-space-size=4096 scripts/run-metro-benchmarks.js
```

---

## 📝 Optimization Checklist

### Pre-Release Checklist
- [ ] Run `npm run metro:benchmark:report`
- [ ] Bundle size < 5MB
- [ ] Build time < 3 minutes
- [ ] No critical security issues
- [ ] Tree shaking effectiveness > 70%
- [ ] Dead code < 10%

### Code Review Checklist
- [ ] New dependencies justified and lightweight
- [ ] Large components use lazy loading
- [ ] Images optimized and compressed
- [ ] No console.log in production code
- [ ] Performance impact assessed

---

## 🚨 Emergency Procedures

### Performance Regression
1. **Immediate**: Revert problematic changes
2. **Analysis**: Run `npm run metro:benchmark:report`
3. **Investigation**: Compare with baseline
4. **Resolution**: Apply targeted optimizations
5. **Verification**: Re-run benchmarks

### Build Failure
1. **Clear cache**: `npm run metro:clean`
2. **Reset Metro**: `npm run metro:reset`
3. **Check config**: `npx metro config --verify`
4. **Update deps**: `npm ci`
5. **Seek help**: Check troubleshooting guide

---

## 📚 Key Files & Locations

| File | Purpose |
|------|---------|
| `metro.config.js` | Metro configuration |
| `scripts/run-metro-benchmarks.js` | Benchmarking system |
| `scripts/analyze-metro-bundle.js` | Bundle analyzer |
| `docs/METRO_OPTIMIZATION_GUIDE.md` | Full documentation |
| `.github/workflows/metro-optimization-analysis.yml` | CI/CD workflow |

---

## 📞 Support

- **Documentation**: `docs/METRO_OPTIMIZATION_GUIDE.md`
- **Issues**: GitHub issue tracker
- **Slack**: `#metro-optimization`
- **Emergency**: metro-support@echotrail.com

---

*Quick Reference v2.0 - Last updated: January 2024*