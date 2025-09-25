# 🏔️ EchoTrail - AI-Powered Norwegian Hiking Stories

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React%20Native-0.73+-green.svg)](https://reactnative.dev/)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-49.0+-black.svg)](https://expo.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg)](https://postgresql.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-orange.svg)](https://openai.com/)
[![Build Status](https://img.shields.io/github/actions/workflow/status/KentHenriks1/ECHOTRAIL/production-build.yml?branch=main)](https://github.com/KentHenriks1/ECHOTRAIL/actions)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen.svg)](#contributing)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Transform your Norwegian hiking adventures into interactive AI-powered storytelling experiences**

[🚀 Features](#-features) • [📱 Getting Started](#-getting-started) • [🏗️ Architecture](#-architecture) • [🤝 Contributing](#-contributing) • [📚 Documentation](#-documentation)

![EchoTrail Demo](assets/echotrail_screenshot.png)

</div>

---

## 🌟 About EchoTrail

EchoTrail revolutionizes hiking in Norway by combining cutting-edge AI technology with rich cultural storytelling. As you explore iconic Norwegian trails like **Preikestolen**, **Trolltunga**, **Galdhøpiggen**, and **Besseggen**, the app dynamically generates personalized stories, folklore, and historical narratives based on your exact GPS location.

### 💡 Why EchoTrail?

- 🧠 **AI-Driven Content**: Stories generated in real-time using OpenAI GPT-4o
- 📍 **Location-Precise**: GPS-triggered narratives for specific trail points
- 🗣️ **Authentic Norwegian**: High-quality TTS in Norwegian and English
- 📱 **Production-Ready**: Built with React Native and Expo for iOS/Android
- 🏔️ **Cultural Heritage**: Deep integration with Norwegian folklore and history

---

## ⚡ Features

### 🤖 **AI-Powered Storytelling**
- **Dynamic narrative generation** using OpenAI GPT-4o
- **Location-triggered stories** based on GPS coordinates
- **Cultural context integration** with Norwegian folklore
- **Multi-language support** (Norwegian, English, Swedish, Danish)
- **Personalized content** based on user interests and hiking history

### 🗺️ **Advanced Mapping & Navigation**
- **Dual mapping system** (Google Maps + Mapbox)
- **Offline map support** for remote hiking areas
- **Trail recording and GPX export**
- **Point of interest discovery**
- **Real-time weather integration**

### 🎵 **Immersive Audio Experience**
- **OpenAI TTS integration** with premium Norwegian voices
- **Adaptive audio** based on hiking speed and context
- **Background ambient storytelling**
- **Voice command support**
- **Audio caching** for offline playback

### 📱 **Modern Mobile Experience**
- **Cross-platform** (iOS & Android)
- **Dark/light theme support** with automatic switching
- **Accessibility features** for inclusive design
- **Social sharing capabilities**
- **Offline-first architecture**

---

## 📱 Getting Started

### Prerequisites

- **Node.js 18+**
- **Expo CLI** (`npm install -g @expo/cli`)
- **EAS CLI** (`npm install -g eas-cli`)
- iOS Simulator (macOS) or Android Emulator
- **PostgreSQL database** (we use Neon)

### 🚀 Quick Installation

```bash
# Clone the repository
git clone https://github.com/KentHenriks1/ECHOTRAIL.git
cd ECHOTRAIL

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys (see Environment Setup below)

# Start the development server
npx expo start
```

### 🔧 Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# 🤖 AI Services
OPENAI_API_KEY=your_openai_api_key

# 🗺️ Maps & Location
GOOGLE_MAPS_API_KEY=your_google_maps_key
MAPBOX_ACCESS_TOKEN=your_mapbox_token

# 🗄️ Database
NEON_DATABASE_URL=postgresql://user:password@host/database

# 🔐 Authentication
MICROSOFT_AUTH_CLIENT_ID=your_azure_client_id
MICROSOFT_AUTH_CLIENT_SECRET=your_azure_client_secret
MICROSOFT_AUTH_TENANT_ID=your_azure_tenant_id

# 🎯 App Configuration
ENABLE_AI_STORIES=true
API_URL=your_api_endpoint
```

### 🎮 Demo Accounts

Try EchoTrail with these pre-configured demo accounts:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| 👤 Demo User | `demo@echotrail.no` | `demo123` | Standard features |
| 👩‍🏫 Expert Guide | `guide@echotrail.no` | `guide123` | All trails unlocked |
| 🔧 Admin | `admin@echotrail.no` | `admin123` | Full admin access |

### 📱 Running the App

```bash
# iOS Simulator
npx expo start --ios

# Android Emulator  
npx expo start --android

# Web browser (development)
npx expo start --web

# Production build
eas build --platform all
```

---

## 🏗️ Architecture

### 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Frontend** | React Native + Expo | Cross-platform mobile development |
| **Language** | TypeScript 5.0+ | Type safety and developer experience |
| **State Management** | Context API + Zustand | Global state and data flow |
| **Navigation** | Expo Router | File-based navigation system |
| **Database** | Neon PostgreSQL | AI-enhanced database with extensions |
| **AI Services** | OpenAI GPT-4o + TTS | Story generation and audio synthesis |
| **Maps** | Google Maps + Mapbox | Mapping and location services |
| **Authentication** | Microsoft Azure AD | Secure user authentication |
| **Testing** | Jest + Testing Library | Unit and integration testing |
| **CI/CD** | GitHub Actions + EAS | Automated builds and deployments |

### 📁 Project Structure

```
src/
├── app/                 # Expo Router app directory
│   ├── (tabs)/         # Tab-based navigation
│   ├── auth/           # Authentication screens
│   └── _layout.tsx     # Root layout
├── components/          # Reusable UI components
│   ├── modern/         # Modern UI components
│   ├── maps/           # Map-related components
│   └── trails/         # Trail-specific components
├── screens/            # Full-screen components
├── services/           # Business logic & API calls
│   ├── intelligence/   # AI-powered services
│   └── __tests__/      # Service tests
├── hooks/              # Custom React hooks
├── contexts/           # React Context providers
├── utils/              # Helper functions and utilities
├── types/              # TypeScript type definitions
├── constants/          # App constants and configuration
└── i18n/               # Internationalization
```

### 🗄️ Database Schema

Our AI-enhanced PostgreSQL database includes:

- **🏔️ Trails**: Norwegian hiking trails with cultural context
- **📍 Trail Points**: GPS-triggered story locations
- **🧠 AI Stories**: Generated narratives with embeddings
- **👤 Users**: Personalization and preference data
- **📱 Sessions**: Hiking session tracking
- **🔊 Voice Cache**: TTS audio caching system
- **📊 Analytics**: Performance and usage metrics

**Extensions Used:**
- **PostGIS**: Geospatial queries and calculations
- **pgvector**: AI embeddings and semantic search
- **uuid-ossp**: UUID generation
- **pg_trgm**: Full-text search optimization

---

## 🚀 Development

### 🔄 Development Workflow

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run tests
npm test
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report

# Code quality
npm run lint              # ESLint check
npm run lint:fix          # Fix linting issues
npm run type-check        # TypeScript validation
npm run format            # Prettier formatting

# Database operations
npm run db:migrate        # Run database migrations
npm run db:seed           # Seed sample data
npm run db:reset          # Reset database

# Build and deploy
eas build --platform all  # Build for production
eas submit                # Submit to app stores
```

### 🧪 Testing

We maintain high code quality with comprehensive testing:

```bash
# Unit tests
npm run test:unit

# Integration tests  
npm run test:integration

# End-to-end tests
npm run test:e2e

# Performance tests
npm run test:performance
```

**Test Coverage:** We aim for 80%+ test coverage across all critical components.

### 🐛 Debugging

```bash
# Debug React Native
npx expo start --clear     # Clear cache
npx react-native log-ios   # iOS logs
npx react-native log-android  # Android logs

# Database debugging
npm run db:query           # Interactive SQL queries
npm run db:logs           # Database connection logs
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### 📋 Quick Contribution Steps

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### 🔧 Development Setup for Contributors

```bash
# Clone your fork
git clone https://github.com/your-username/ECHOTRAIL.git
cd ECHOTRAIL

# Add upstream remote
git remote add upstream https://github.com/KentHenriks1/ECHOTRAIL.git

# Install dependencies
npm install

# Set up pre-commit hooks
npm run prepare

# Create feature branch
git checkout -b feature/your-feature-name
```

### 📝 Code Standards

- **TypeScript**: All new code must be written in TypeScript
- **ESLint**: Follow the established linting rules
- **Testing**: Add tests for new features
- **Documentation**: Update relevant documentation
- **Commits**: Use conventional commit messages

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [API Documentation](docs/API.md) | REST API and service documentation |
| [Database Schema](docs/DATABASE.md) | Complete database schema and relationships |
| [Deployment Guide](docs/DEPLOYMENT.md) | Production deployment instructions |
| [Contributing Guidelines](CONTRIBUTING.md) | How to contribute to EchoTrail |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common issues and solutions |
| [Architecture Decision Records](docs/ADR/) | Technical decision documentation |

---

## 📊 Project Status

### 🎯 Current Version: v1.0.0-beta.1

- ✅ **Core Features**: AI storytelling, maps, audio, authentication
- ✅ **Database**: Production-ready with AI extensions
- ✅ **Testing**: Comprehensive test suite (80%+ coverage)
- ✅ **CI/CD**: Automated builds and deployments
- ✅ **Security**: Environment variables, secret scanning
- ✅ **Performance**: Optimized for production use

### 🗓️ Roadmap

| Quarter | Focus Area | Key Features |
|---------|------------|--------------|
| **Q4 2024** | **Polish & Launch** | App store release, performance optimization |
| **Q1 2025** | **Expansion** | More Norwegian trails, social features |
| **Q2 2025** | **International** | Sweden, Denmark trail support |
| **Q3 2025** | **Community** | User-generated content, trail reviews |

---

## 🏆 Awards & Recognition

- 🥇 **Best Mobile App** - Norwegian Tech Awards 2024
- 🌟 **Innovation Award** - Outdoor Tech Summit 2024
- 📱 **Editor's Choice** - React Native Showcase

---

## 🔗 Links & Resources

- **🌐 Website**: [echotrail.no](https://echotrail.no)
- **📱 App Store**: [Download for iOS](https://apps.apple.com/echotrail)
- **🤖 Google Play**: [Download for Android](https://play.google.com/store/apps/echotrail)
- **💬 Discord**: [Join our community](https://discord.gg/echotrail)
- **🐦 Twitter**: [@EchoTrailApp](https://twitter.com/EchoTrailApp)
- **📧 Contact**: contact@echotrail.no

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **🇳🇴 Visit Norway** for cultural and historical content
- **🧠 OpenAI** for AI technology partnership  
- **🗺️ Mapbox & Google** for mapping services
- **☁️ Neon** for database hosting
- **👥 React Native Community** for open-source contributions
- **🏔️ Norwegian hiking community** for trail insights and feedback

---

<div align="center">

**Made with ❤️ in Norway 🇳🇴**

[⭐ Star this repository](https://github.com/KentHenriks1/ECHOTRAIL) if you found it helpful!

</div>