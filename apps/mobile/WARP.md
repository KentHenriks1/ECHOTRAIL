# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

EchoTrail is an **AI-driven storytelling app** that uses location-based information to create immersive experiences. This is a React Native mobile app built with Expo 54, featuring GPS-based trail tracking, AI-generated audio content, and location-aware storytelling.

### Project Structure Note

**Important**: There are two related EchoTrail directories:

1. **Current Location** (Development/Blueprint): `C:\Users\Kenth\Desktop\echotrail-project\echotrail\apps\mobile`
   - This is the monorepo structure with development setup
   - Contains the comprehensive architecture and service definitions

2. **Working Build** (Proven Functional): `C:\Users\Kenth\Desktop\EchoTrail-Fresh-Build`
   - This is the **"ferske mappe"** (fresh folder) with **only working functionality**
   - Contains the actual, tested, and functional mobile app code
   - Has ready APK files and proven functionality
   - **Use this directory when you need a working, tested codebase**

When working on features that need to function immediately, reference or work in the `EchoTrail-Fresh-Build` directory. When working on architecture or planning, use the current monorepo structure.

### Key Features
- **AI-Guided Tours**: Location-based storytelling with OpenAI integration
- **GPS Trail Recording**: Real-time location tracking and trail storage
- **Multi-language Support**: Norwegian/English with i18next
- **Admin System**: Role-based access for OpenAI TTS configuration
- **Audio System**: Text-to-speech with intelligent audio management
- **Offline Maps**: Map caching and offline functionality
- **Authentication**: User registration/login with role management

## Development Commands

### Essential Commands

```powershell
# Start development server (primary command)
pnpm start
# Alternative: expo start

# Start with specific platform
pnpm android:go        # Android via Expo Go
pnpm android           # Build and run on Android device
pnpm ios               # Build and run on iOS device
pnpm web               # Run in web browser

# Development workflow
pnpm typecheck         # TypeScript compilation check
pnpm lint              # ESLint with max 0 warnings
pnpm lint:fix          # Auto-fix linting issues
pnpm fmt:fix           # Format code with Prettier
pnpm build             # TypeScript build verification

# Quality assurance (comprehensive)
pnpm qa                # Fast QA: format, lint, typecheck, test, build
pnpm qa:full           # Full QA: includes deadcode, deps check, coverage, e2e, security
pnpm qa:db             # Database-focused QA with API tests
```

### Testing Commands

```powershell
# Unit and integration testing
pnpm test              # Run Jest tests
pnpm test:watch        # Run tests in watch mode
pnpm test:coverage     # Generate coverage reports
pnpm test:ci           # CI mode with verbose output

# Specialized test suites
pnpm test:db           # Database tests
pnpm test:api          # API integration tests
pnpm test:api:advanced # Advanced API + contract tests
pnpm test:performance  # Performance benchmarks
pnpm test:all          # Run all test types with reporting

# End-to-end testing
pnpm e2e               # Playwright tests
pnpm e2e:headed        # E2E tests with browser UI
pnpm e2e:debug         # Debug mode for E2E tests

# Mobile UI testing
pnpm maestro:test      # Run Maestro mobile UI tests
pnpm maestro:smoke     # Smoke tests for core functionality
```

### Code Quality & Security

```powershell
# Code analysis
pnpm deadcode          # Find unused code with Knip
pnpm deps:unused       # Check for unused dependencies
pnpm ts:prune          # Find unused TypeScript exports

# Security scanning
pnpm semgrep           # Security audit with Semgrep
pnpm snyk              # Vulnerability scanning
```

### Build & Deployment

```powershell
# APK generation
pnpm build:ios:simulator    # iOS simulator build
pnpm build:analyze          # Bundle analysis

# Development hooks
pnpm pre-commit        # Lint-staged pre-commit checks
pnpm pre-push          # QA checks before push
pnpm pre-push:full     # Comprehensive checks before push
```

## Architecture Overview

### High-Level Structure

```
apps/mobile/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # Screen components (20+ screens)
│   ├── services/       # Business logic & API services (29+ services)
│   ├── contexts/       # React Context providers (Auth, Theme)
│   ├── hooks/          # Custom React hooks
│   ├── i18n/          # Internationalization (Norwegian/English)
│   ├── utils/         # Helper functions and utilities
│   ├── config/        # Configuration files (API, database)
│   ├── constants/     # App constants and icons
│   └── security/      # Security management
├── android/           # Android native build configuration
├── .maestro/         # Mobile UI test flows
└── assets/           # Images, icons, splash screens
```

### Key Architectural Components

**Navigation System**:
- Bottom tab navigation with 4 main sections: Discover, Memories, EchoTrail AI, Settings
- Stack navigation for screen transitions
- Authentication flow with login/register screens

**Service Layer Architecture**:
- `AppInitService`: Application initialization and setup
- `LocationService` & `IntelligentLocationService`: GPS tracking and location intelligence
- `AIStoryService` & `OpenAITTSService`: AI content generation and text-to-speech
- `TrailService` & `TrailRecordingService`: Trail management and recording
- `AudioGuideService` & `IntelligentAudioSystem`: Audio playback and management
- `DatabaseService`: Local data persistence
- `ApiService`: Backend API communication
- `OfflineMapService` & `OfflineMapManager`: Map caching and offline functionality

**Authentication & Authorization**:
- Role-based access control (Admin vs Regular User)
- Secure token storage with expo-secure-store
- Admin-only features: OpenAI TTS configuration, global API settings

**Audio & AI Integration**:
- Real-time AI content generation based on location
- Intelligent audio system with background playback
- OpenAI integration for story generation and TTS
- Speed-adaptive content (stationary, walking, driving modes)

## Development Workflows

### Starting Development

```powershell
# For monorepo development (architecture/planning):
cd apps/mobile
pnpm install
pnpm start

# For working with proven functionality:
cd "C:\Users\Kenth\Desktop\EchoTrail-Fresh-Build"
pnpm install
pnpm start
# or: expo start

# Use Expo Go app to scan QR code, or run on device:
pnpm android:go     # For Android testing
```

**Choose your starting point**:
- **Monorepo** (`apps/mobile`): For architecture work, service development, monorepo features
- **Fresh-Build**: For immediate functionality, testing working features, APK generation

### Code Quality Workflow

```powershell
# Before committing code
pnpm qa                # Quick quality check
pnpm qa:full          # Comprehensive check (includes security, e2e)

# The QA commands run:
# - Prettier formatting
# - ESLint fixes
# - TypeScript compilation
# - Jest tests
# - Build verification
# - Dependency checks
# - Security scanning
```

### Testing Strategy

**Unit Tests**: Focus on services and utilities
**Integration Tests**: API connectivity and data flow
**E2E Tests**: Complete user journeys with Playwright
**Mobile UI Tests**: Native mobile flows with Maestro
**Performance Tests**: Location services and audio performance

### Working with Location & AI Features

The app has sophisticated location intelligence:
- **Stationary Mode**: Generates deep, detailed stories (2-4 minutes)
- **Walking Mode**: Route-based stories timed to arrival
- **Driving Mode**: Quick landmark descriptions (30-60 seconds)

Key services to understand:
- `IntelligentLocationService`: Speed detection and movement analysis
- `AIContentPipeline`: Real-time story generation
- `IntelligentAudioSystem`: Context-aware audio management

## Technical Context

### Tech Stack
- **React Native** 0.81.0 with **Expo 54.0.7**
- **TypeScript** 5.6.3 (100% type-safe codebase)
- **React Navigation** 7.0.0 (Bottom tabs + Stack)
- **i18next** for internationalization
- **Jest** + **Playwright** + **Maestro** for testing
- **expo-location** for GPS services
- **expo-audio** for audio playbook
- **react-native-maps** for mapping

### Environment Configuration
- Uses `app.json` for Expo configuration
- Environment variables in `.env` files
- API keys and secrets configured in `app.json.extra.echotrail`
- Supports both development and production builds

### Monorepo Context
This mobile app is part of a larger monorepo structure:
- `../../backend/`: Node.js API server
- `../../packages/`: Shared TypeScript types and utilities
- Managed with pnpm workspaces and Turbo

### Database Integration
- PostgreSQL with Neon cloud hosting
- Local SQLite for offline functionality
- API communication through `ApiService`
- Database URL: Configured in environment variables

### Platform-Specific Notes
- **Android**: Configured for API level 26-35, with comprehensive permissions
- **iOS**: Supports tablets, configured bundle identifier
- **Permissions**: Location (foreground/background), camera, audio, notifications
- **Maps**: Google Maps integration with API key configuration

## Common Development Tasks

### Adding New Screens
1. Create screen component in `src/screens/`
2. Add to navigation in `App.tsx`
3. Update i18n translations if needed
4. Add corresponding test file

### Working with Location Features
- Location services are initialized in `AppInitService`
- Use `IntelligentLocationService` for advanced GPS features
- Test location features with device/emulator GPS simulation

### Adding AI Features
- Story generation through `AIContentPipeline`
- OpenAI integration via `OpenAITTSService`
- Admin configuration through settings screens

### Working with Audio
- Use `EchoTrailSoundService` for audio playback
- Background audio managed by `IntelligentAudioSystem`
- TTS functionality through OpenAI integration

### Database Operations
- Local storage via `DatabaseService`
- API communication through `ApiService`
- Offline support with local caching

## Important Files & Paths

### Working vs Development Directories

**EchoTrail-Fresh-Build** (Proven Working Code):
```
C:\Users\Kenth\Desktop\EchoTrail-Fresh-Build\
├── src/                    # Complete working source code
├── *.apk                   # Ready-to-install APK files
├── package.json           # Working dependencies
├── App.tsx                # Functional app entry point
└── README.md              # Working app documentation
```

**Monorepo Structure** (Development/Architecture):
```
apps/mobile/               # Current directory - development blueprint
├── src/                   # Service definitions and architecture
├── WARP.md               # This file
└── [comprehensive structure as detailed above]
```

### Configuration Files
- `app.json`: Expo configuration, permissions, API keys
- `tsconfig.json`: TypeScript configuration with path mapping
- `metro.config.js`: Metro bundler configuration
- `jest.config.js`: Jest testing configuration
- `playwright.config.ts`: E2E testing configuration

### Key Source Files
- `App.tsx`: Main application entry point and navigation
- `src/services/AppInitService.ts`: Application initialization
- `src/contexts/AuthContext.tsx`: Authentication state management
- `src/services/IntelligentLocationService.ts`: Advanced GPS features
- `src/services/AIContentPipeline.ts`: AI story generation

### Build & Deployment
- `android/`: Android native configuration
- `.expo/`: Expo development configuration
- `.maestro/flows/`: Mobile UI test specifications

This is a sophisticated, production-ready mobile application with advanced AI and location features. The codebase is well-structured, fully TypeScript-typed, and includes comprehensive testing infrastructure.

## Quick Reference: When to Use Which Directory

| Task | Use Directory | Reason |
|------|---------------|--------|
| **Immediate functionality testing** | `EchoTrail-Fresh-Build` | Proven working code, ready APKs |
| **Feature development that must work** | `EchoTrail-Fresh-Build` | Tested, functional codebase |
| **APK generation & deployment** | `EchoTrail-Fresh-Build` | Has working build configuration |
| **Architecture planning** | `apps/mobile` (current) | Comprehensive service definitions |
| **Monorepo integration** | `apps/mobile` (current) | Part of larger monorepo structure |
| **Service layer development** | `apps/mobile` (current) | Complete architecture documentation |

**Rule of thumb**: If you need it to work immediately, use `EchoTrail-Fresh-Build`. If you need to understand or extend the architecture, use the current monorepo location.

---

# 🚨 ECHOTRAIL KRITISKE REGLER - NULLTOLERANSE

## **ABSOLUTT FORBUD MOT PLACEHOLDER FUNKSJONALITET**

### **ALDRI IMPLEMENTER:**
- "Kommer snart" meldinger
- "Will be available soon" tekst  
- "Coming soon" funksjonalitet
- "Under construction" plassholders
- Knapper/lenker som ikke fungerer
- Mock/dummy responses uten backend
- Alert.alert med "soon" eller "available later"
- Disabled functionality without full implementation

### **HVIS DU FINNER SLIKE - STOPP ALT OG FIKS UMIDDELBART!**

### **MANDATORY PRE-COMMIT VALIDERING:**
```bash
# Søk etter FORBUDTE termer FØRST
grep -r "coming soon\|kommer snart\|available soon\|under construction" src/
grep -r "Alert.alert.*soon\|Alert.alert.*coming\|Alert.alert.*available" src/
grep -r "TODO.*later\|FIXME.*later\|placeholder" src/

# Hvis NOEN treff - IKKE COMMIT FØR DET ER FIKSET!
```

### **PRODUKSJONSREGLER - ALLE FEATURES SKAL:**
- ✅ Ha FUNGERENDE backend integration
- ✅ FAKTISK gjøre det de sier de skal gjøre  
- ✅ Ha riktige error handling
- ✅ Være 100% funksjonelle ved release
- ✅ Kunne testes ende-til-ende
- ✅ Ha real data, ikke mock responses

### **EMERGENCY RESPONSE - HVIS PLACEHOLDER OPPDAGES:**
1. 🚨 STOPP alle andre oppgaver
2. 🔧 FIKS umiddelbart - ikke neste sprint  
3. 🧪 TEST grundig
4. 🚀 DEPLOY fix øyeblikkelig
5. 📝 DOKUMENTER hvorfor det skjedde
6. 🛡️ LEGG TIL preventive tiltak

### **PRE-BUILD VALIDATION SCRIPT:**
```bash
echo "🔍 Sjekker for placeholder funksjonalitet..."
if grep -r "coming soon\|kommer snart\|available soon" src/; then
  echo "❌ FEIL: Placeholder funksjonalitet funnet!"
  echo "🚨 FIKS FØR BUILD!"
  exit 1
fi
echo "✅ Ingen placeholder funksjonalitet funnet"
```

### **DEFINITION OF DONE - FEATURE ER IKKE FERDIG UTEN:**
- ✅ Backend integration working 100%
- ✅ Frontend fully functional
- ✅ NO placeholder messages anywhere
- ✅ Proper error handling  
- ✅ User can complete full workflow
- ✅ Tested on real device
- ✅ NO "TODO: implement later"
- ✅ All buttons/forms work as expected
- ✅ Real API calls, not mocked responses

### **CODE REVIEW MANDATORY CHECKLIST:**
- [ ] Ingen "kommer snart" meldinger
- [ ] Alle knapper fungerer
- [ ] Alle forms sender data til backend
- [ ] Ingen placeholder alerts
- [ ] Auth fungerer 100%
- [ ] All funksjonalitet er implementert
- [ ] Proper error messages (not generic)
- [ ] Backend integration tested

## 🎯 **MANTRA: "IF IT'S IN THE APP, IT MUST WORK 100%"**

**NO EXCUSES. NO EXCEPTIONS. NO PLACEHOLDERS. PERIOD.**

**EVERY BUTTON. EVERY FORM. EVERY FEATURE. MUST. WORK.**

---

# Microsoft Azure AD Authentication - Backend Integration

## 🎯 Oversikt
Denne dokumentasjonen dekker fullstendig implementering av Microsoft Azure AD authentication i EchoTrail backend. All konfigurering, kode og Azure-setup er dokumentert for fremtidig referanse.

## 🏗️ Backend Arkitektur

### Authentication Implementation
- **Autentisering**: Microsoft Graph API med OAuth 2.0
- **Middleware**: Custom auth middleware (`../../backend/middleware/microsoftAuth.js`)
- **Ruter**: Dedikerte auth-ruter (`../../backend/routes/auth.js`)
- **Database**: Prisma schema oppdatert med Microsoft-felter
- **Typer**: TypeScript definisjoner for Microsoft auth

### Mobile App Integration (Dette prosjektet)
- **Login Flow**: Redirect til backend Microsoft OAuth endpoint
- **Token Håndtering**: Secure cookie-basert session med backend
- **Auth Context**: React Native auth provider med Microsoft support
- **API Integration**: Mobile app kommuniserer med Microsoft-auth backend

## 📋 Azure App Registration Konfigurering

### App Registration Detaljer
```
Application Name: EchoTrail-Auth
Application ID: [GENERERT AV AZURE]
Directory (tenant) ID: [DIN TENANT ID]
```

### API Permissions (Microsoft Graph)
```
Delegated Permissions:
✅ User.Read (Sign in and read user profile)
✅ User.Read.All (Read all users' full profiles) 
✅ email (View users' email address)
✅ openid (Sign users in)
✅ profile (View users' basic profile)
✅ offline_access (Maintain access to data)

Status: ✅ Admin consent granted
```

### Database Schema Updates (Backend)
```prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  name              String?
  microsoftId       String?   @unique
  microsoftEmail    String?
  profilePicture    String?
  lastLogin         DateTime?
  isActive          Boolean   @default(true)
  role              UserRole  @default(USER)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Existing relations...
  processes         Process[]
  hashLookups       HashLookup[]
  apiKeys          ApiKey[]
  
  @@map("users")
}
```

## 📱 Mobile App Integration Endpoints

### Authentication Flow for Mobile
```typescript
// Mobile app auth flow:
// 1. User taps "Sign in with Microsoft"
// 2. App redirects to: {API_BASE}/auth/microsoft
// 3. Backend handles Microsoft OAuth flow
// 4. Backend redirects back to mobile app with session
// 5. Mobile app gets user info from: {API_BASE}/auth/me

// Example API calls from mobile:
const API_BASE = 'http://localhost:3001'; // eller production URL

// Start Microsoft auth
const startAuth = () => {
  window.location.href = `${API_BASE}/auth/microsoft`;
};

// Check auth status
const checkAuth = async () => {
  const response = await fetch(`${API_BASE}/auth/status`);
  return response.json();
};

// Get current user
const getCurrentUser = async () => {
  const response = await fetch(`${API_BASE}/auth/me`);
  return response.json();
};
```

## ⚡ Development Commands

### Backend Commands (Microsoft Auth)
```bash
# Backend location
cd ../../backend/

# Aktivere Microsoft Auth
export ENABLE_MICROSOFT_AUTH=true
npm run dev

# Check auth status
curl http://localhost:3001/auth/status | jq

# Database operations
npx prisma migrate reset
npx prisma db push
npx prisma generate
```

### Mobile Development Commands
```bash
# For testing Microsoft auth integration
pnpm start
pnpm android:go  # Test auth flow on Android

# Test auth-related API calls
pnpm test:api    # API integration tests
pnpm test:auth   # Auth-specific tests (hvis implementert)
```

## 🎯 Microsoft Auth Status

### ✅ Fullført (Backend)
- Azure App Registration opprettet og konfigurert
- Backend middleware fullstendig implementert
- Database schema oppdatert med Microsoft-felter
- Auth routes implementert i backend
- Environment variables satt opp
- Azure CLI konfigurert og API permissions gitt

### ⏳ Gjenstående
- [ ] Installer manglende NPM pakker i backend
- [ ] Løs TypeScript type konflikter i backend
- [ ] Implementer Microsoft auth i mobile app (AuthContext)
- [ ] Test full authentication flow (mobile ↔ backend)
- [ ] Sett ENABLE_MICROSOFT_AUTH=true når alt er klart
- [ ] End-to-end testing av Microsoft OAuth flow

### 🔄 Fremtidige Forbedringer
- Deep linking for bedre mobile auth experience
- Single Sign-On (SSO) integration
- Multi-tenant support
- Advanced role mapping fra Microsoft AD
- Audit logging for authentication events

**📝 Microsoft Auth Notat**: Backend implementasjon er komplett men midlertidig deaktivert på grunn av pakkeinstalleringsproblemer i monorepo workspace. Mobile app integration gjenstår. All kode og konfigurasjon er dokumentert i `C:\Users\Kenth\Desktop\microsoft-auth-documentation.md`.

**Backend Location**: `../../backend/` (relative til current mobile app directory)

---

*These rules are MANDATORY and NON-NEGOTIABLE for all EchoTrail development.*
