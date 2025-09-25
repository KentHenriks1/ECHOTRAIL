# EchoTrail - Production Deployment Guide

**Enterprise deployment guide for EchoTrail AI-powered storytelling platform**

Complete deployment instructions for the production-ready EchoTrail platform featuring advanced AI integration, enterprise authentication, and comprehensive monitoring.

**Contact**: Kent Rune Henriksen <Kent@zentric.no> | Zentric AS

## 🚀 Production Deployment

### Prerequisites

- **Node.js 20+** (LTS version)
- **Expo CLI 54+** and **EAS CLI** latest
- **Android Studio** (for Android builds)
- **Xcode 15+** (for iOS builds, macOS only)
- **Valid certificates** and **API keys**
- **Neon PostgreSQL** database access
- **OpenAI API** access (GPT-4o)
- **Microsoft Azure AD** tenant (for enterprise auth)

### Environment Setup

1. **Environment Variables**
   ```bash
   # Copy production environment
   cp .env.production .env
   
   # Required variables (examples)
   OPENAI_API_KEY=...
   GOOGLE_MAPS_API_KEY=...
   MAPBOX_ACCESS_TOKEN=...
   NEON_DATABASE_URL=...
   MICROSOFT_AUTH_CLIENT_ID=...
   MICROSOFT_AUTH_CLIENT_SECRET=...
   MICROSOFT_AUTH_TENANT_ID=...
   API_URL=https://api.echotrail.com
   
   # Verify all required variables are set
   # (Use your preferred env checker)
   ```

2. **Dependencies**
   ```bash
   # Install production dependencies
   npm ci --production
   
   # Clear Metro cache
   npx metro --reset-cache
   ```

### Build Process

#### 1. Pre-build Checks
```bash
# Run full test suite
npm test

# TypeScript compilation check
npm run build

# Lint and format
npm run lint
npm run format
```

#### 2. Production Build
```bash
# Set production environment
$Env:NODE_ENV="production"  # PowerShell on Windows

# Build for Android (AAB)
eas build --platform android --profile production --non-interactive

# Optional: APK for internal testing
eas build --platform android --profile preview --non-interactive

# Build for iOS (requires macOS)
eas build --platform ios --profile production --non-interactive
```

#### 3. App Store Deployment

**Google Play Store:**
```bash
# Submit to Google Play
npx eas submit --platform android --profile production
```

**Apple App Store:**
```bash
# Submit to App Store
npx eas submit --platform ios --profile production
```

### Database Migration

1. **Production Database Setup**
   ```bash
   # Using Prisma (backend)
   cd apps/backend
   npm ci
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

2. **Verify API Connectivity**
   ```bash
   # Health check (after deploy)
   curl https://api.echotrail.com/health
   ```

### Production Configuration

#### Performance Optimizations
- Tree shaking enabled via Metro config
- Minification with optimized settings  
- Asset optimization for smaller bundle size
- Intelligent lazy loading for UI components

#### Security Configuration
- All API keys secured via environment variables
- Biometric authentication enabled
- SSL/TLS certificates validated
- CORS properly configured

#### Monitoring & Analytics
- Crash reporting enabled
- Performance monitoring active
- User analytics tracking (privacy compliant)
- Error logging configured

## 🏗️ CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: Deploy Production
on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build production
        run: NODE_ENV=production npm run build
      
      - name: Deploy to stores
        run: |
          npx eas build --platform all --profile production --non-interactive
          npx eas submit --platform all --profile production --non-interactive
```

### Environment Branches
- `development` → Development builds
- `staging` → Preview builds  
- `main` → Production builds

## 📱 Device Testing

### Minimum Requirements
- **Android:** API level 21+ (Android 5.0)
- **iOS:** iOS 13.0+
- **RAM:** 3GB minimum, 4GB recommended
- **Storage:** 500MB free space

### Test Device Matrix
- Samsung Galaxy S21+ (Android 12)
- Google Pixel 6 (Android 13)
- iPhone 12 (iOS 16)
- iPhone 14 Pro (iOS 17)

### Performance Targets
- Cold start: < 3 seconds
- Navigation: < 200ms
- GPS lock: < 5 seconds
- Battery drain: < 5% per hour of active use

## 🔧 Production Features

### Intelligent Design System
- **Movement-aware UI:** Adapts interface based on walking, cycling, driving, or stationary modes
- **Context-sensitive interactions:** Touch targets and animations adjust automatically
- **Accessibility optimized:** Full support for screen readers, high contrast, and reduced motion

### Core Features
- ✅ Real-time GPS trail recording
- ✅ Intelligent movement mode detection  
- ✅ Adaptive UI based on user context
- ✅ Offline map capabilities
- ✅ AI-powered story generation
- ✅ Social sharing and communities
- ✅ Biometric authentication
- ✅ Background location tracking

### API Integration
- **Neon PostgreSQL:** Primary database with PostGIS
- **OpenAI API:** AI story generation
- **Google Maps:** Location services
- **Mapbox:** Offline maps
- **Stack Auth:** Authentication

## 🌍 Localization

### Supported Languages
- Norwegian (primary)
- English (secondary)

### Implementation
- React Native i18n
- Dynamic language switching
- RTL support ready

## 🔒 Security & Privacy

### Data Protection
- GDPR compliant
- Norwegian data protection laws
- User consent management
- Data encryption at rest and in transit

### API Security
- JWT tokens with refresh
- Rate limiting implemented
- Input validation and sanitization
- SQL injection protection

## 📊 Monitoring & Analytics

### Performance Monitoring
- Real-time crash reporting
- Performance metrics tracking
- User behavior analytics (anonymized)
- Network request monitoring

### Health Checks
- API endpoint health monitoring
- Database connectivity checks
- Third-party service status
- App store deployment status

## 🚨 Rollback Procedures

### Emergency Rollback
1. **Immediate:** Revert to previous app version in stores
2. **API Issues:** Switch to backup API endpoints
3. **Database Issues:** Restore from latest backup
4. **Complete Failure:** Activate maintenance mode

### Monitoring Alerts
- App crash rate > 1%
- API response time > 2s
- User satisfaction score < 4.0
- Active user count drop > 20%

## 📞 Support & Maintenance

### Support Channels
- Email: support@echotrail.no
- GitHub Issues: [ECHOTRAIL Repository](https://github.com/KentHenriks1/ECHOTRAIL)
- Documentation: [Project Wiki](https://github.com/KentHenriks1/ECHOTRAIL/wiki)

### Maintenance Schedule
- **Weekly:** Dependency updates
- **Monthly:** Security patches
- **Quarterly:** Feature releases
- **As needed:** Critical bug fixes

---

## 🎯 Success Metrics

### Technical KPIs
- 99.9% uptime
- < 1% crash rate
- < 3s app load time
- > 95% test coverage

### User Experience KPIs
- > 4.5 app store rating
- < 10% user churn rate
- > 80% feature adoption
- > 60% daily active users

### Business KPIs
- > 10,000 downloads (Year 1)
- > 1,000 active trails created
- > 500 community members
- > 50% user retention (30 days)

---

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Maintainer:** EchoTrail Development Team