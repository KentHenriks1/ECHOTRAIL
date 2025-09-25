# EchoTrail Mobile App - Enterprise Edition

**Production-ready React Native app with advanced AI integration**

🚀 **Status**: Google Play Store validated, EAS production builds ready  
🤖 **AI**: Advanced OpenAI GPT-4o integration with context-aware storytelling  
📱 **Platform**: Cross-platform iOS/Android via Expo 54 + React Native 0.81  
🏗️ **Architecture**: Enterprise-grade monorepo with comprehensive testing  

**Contact**: Kent Rune Henriksen <Kent@zentric.no> | Zentric AS

## 🎆 Enterprise Features

### 🔐 Authentication & Security
- **Google Sign-In**: Enterprise-grade auth via @react-native-google-signin/google-signin
- **Microsoft Azure AD**: Business authentication integration
- **JWT Tokens**: Secure session management with refresh tokens
- **Secret Management**: Environment variable security

### 📍 Location & Navigation  
- **Advanced GPS**: expo-location with foreground/background tracking
- **Enhanced Context**: Weather, season, time-based location awareness
- **Trail Recording**: Comprehensive GPS track point storage
- **Offline Support**: Cached maps and trail data

### 🤖 AI & Storytelling
- **OpenAI GPT-4o**: Advanced story generation with cost optimization
- **Context-Aware**: Stories adapt to season, weather, time of day
- **Premium TTS**: High-quality Norwegian voice synthesis
- **Intelligent Caching**: Location-based story caching with smart expiration

### 🚀 Performance & Production
- **Metro Optimization**: Advanced bundling with custom transformers
- **EAS Builds**: Production-ready deployment pipeline
- **Comprehensive Testing**: Unit, integration, performance, and E2E tests
- **CI/CD Integration**: Automated builds and quality gates

## 🛠️ Technical Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | Expo 54 + React Native 0.81 | Cross-platform mobile development |
| **Language** | TypeScript 5.6+ | Type safety and enterprise development |
| **Build System** | EAS Build + Metro Bundler | Production builds and optimization |
| **Backend** | Express.js + Prisma ORM | API services with database ORM |
| **Database** | Neon PostgreSQL | Cloud-native database with AI extensions |
| **AI Services** | OpenAI GPT-4o + TTS-1-HD | Story generation and voice synthesis |
| **Authentication** | Google Sign-In + Azure AD | Multi-provider authentication |
| **Navigation** | React Navigation 7+ | Stack and tab navigation |
| **Testing** | Jest + Playwright + MSW | Comprehensive testing suite |
| **Deployment** | Vercel + EAS + GitHub Actions | Automated CI/CD pipeline |

## 🧠 Avansert AI og Context Pool Arkitektur

### Context-Aware Storytelling System

EchoTrail implementerer et sofistikert AI-system som dynamisk tilpasser seg:

**Enhanced Location Context Service** (`EnhancedLocationContextService.ts`)
- **Sesongbasert kontekst**: Automatisk tilpasning til vinter/vår/sommer/høst
- **Tidsbasert kontekst**: Morgen/ettermiddag/kveld/natt-algoritmer
- **Værintegrasjon**: Intelligente anbefalinger basert på værforhold  
- **Kulturell kontekst**: Automatisk deteksjon av norske tradisjoner
- **Trail-vanskelighet**: Dynamisk beregning av stivanskelighet

**Location-Based Story Cache** (`LocationBasedStoryCacheService.ts`)
- **Geografisk clustering**: Intelligent regioninndeling og story-gruppering
- **Proximitetssøk**: Haversine-baserte algoritmer for nærliggende historier
- **Popularitets-scoring**: Dynamisk rangering basert på brukeraktivitet
- **Utløpsalgoritmer**: Intelligente cache-strategier (7-30 dager)
- **Cache-statistikk**: Real-time analyse av hit-rate og ytelse

**AI Performance Service** (`AIPerformanceService.ts`)
- **Adaptiv ytelsesovervåking**: Automatisk justering av AI-parametere
- **Cost-optimalisering**: Algoritmer for å minimere OpenAI-kostnader  
- **Cache-effektivitet**: Intelligent omdirigering ved høy belastning
- **Error-rate monitoring**: Automatisk failover og retry-logikk
- **Performance alerts**: Real-time varsling ved ytelsesfall

**Story Feedback Service** (`StoryFeedbackService.ts`)
- **Lærende algoritmer**: Automatisk justering av story-preferanser
- **Brukerpreferanse-evolusjon**: Dynamisk tilpasning over tid
- **Sentiment-analyse**: Intelligent kategorisering av tilbakemeldinger
- **Trending-deteksjon**: Identifikasjon av populære temaer og stiler

### Algoritmer for Forbedret Brukeropplevelse

**Personalization Algorithms:**
- Location History Learning: Lærer brukerens favorittområder
- Time-of-Day Adaptation: Ulike story-stiler for ulike tidspunkt
- Weather-Responsive Content: Historier tilpasses værforhold automatisk
- Seasonal Storytelling: Helt andre narrativ-stiler for ulike årstider

**Performance Algorithms:**
- Intelligent Caching: Multi-lag caching (story + location + user)
- Predictive Prefetching: Forutsier hvilke historier brukeren vil like
- Load Balancing: Fordeler AI-forespørsler for optimal responstid
- Adaptive Quality: Justerer story-lengde basert på tilkobling

**Context-Aware Algorithms:**
- Cultural Context Detection: Automatisk deteksjon av kulturelle referanser
- Local Event Integration: Integrerer lokale begivenheter i historier
- Terrain-Adaptive Content: Historier tilpasses fjell vs. skog vs. sjø
- User Mood Inference: Detekterer brukerens humør basert på valgte ruter

## Konfig og miljø

- app.json: plugins (expo-splash-screen, expo-build-properties, expo-location, @react-native-google-signin/google-signin)
- EAS env: EXPO_PUBLIC_API_BASE_URL, EXPO_PUBLIC_GOOGLE_MAPS_API_KEY, EXPO_PUBLIC_OPENAI_API_KEY m.fl.
- .easignore: ekskluderer unødvendige filer for raskere opplasting
- .gitignore: ekskluderer .turbo/ og *.tsbuildinfo

## Lokal utvikling

```bash
pnpm install
cd apps/mobile
npx expo start --android
```

## EAS build

```bash
# Development
eas build --platform android --profile development

# Production (om minify/proguard feiler, slå av i app.json via expo-build-properties midlertidig)
eas build --platform android --profile production
```

## Backend health (etter deploy)

```bash
curl https://<vercel-app-url>/api/health
```

## Status

- APK generert: apps/mobile/echotrail-playstore.apk (klar for testing og Play Store)
- Backend: Vercel-konfig commit’et (vercel.json, api/index.ts, .vercel/project.json)
- Database: Neon prosjekt-ID i .neon, prisma schema i apps/api/prisma/

## 🤖 AI & Text-to-Speech (TTS)

**Status: ✅ PRODUKSJONSKLAR** - Full OpenAI integrasjon implementert

### 🎯 Hovedfunksjoner
- **Kontekstbaserte historier**: AI genererer norske historier fra GPS trail-data
- **Høykvalitets TTS**: OpenAI TTS-1-HD for naturlig norsk uttale
- **Smart caching**: Lokal lagring reduserer API-kall og forbedrer ytelse
- **Kostnadsoptimalisering**: Innebygd overvåking (~$0.04 per komplett historie)
- **Graceful fallback**: System TTS som backup ved API-problemer

### 📚 Dokumentasjon
- **[OPENAI_TTS_SETUP.md](OPENAI_TTS_SETUP.md)** - Komplett setup-guide
- **[docs/AI_TTS_INTEGRATION.md](docs/AI_TTS_INTEGRATION.md)** - Teknisk arkitektur
- **[AI_INTEGRATION_SUMMARY.md](AI_INTEGRATION_SUMMARY.md)** - Prosjektoversikt
- **[AUDIO_STRATEGY.md](AUDIO_STRATEGY.md)** - Audio branding og strategi

### 🧪 Testing
- Bruk **AITestScreen** (🤖 tab) for omfattende testing
- Mock Oslo-data for demonstrasjon av full workflow
- Performance-metrics og cost tracking innebygd

## 🗺️ Offline Maps

**Status: ⚠️ UNDER UTVIKLING** - Infrastruktur finnes, krever oppgraderinger

### 📍 Hva som Finnes
- **OfflineMapManager/Service**: Grunnleggende tile-nedlasting og caching
- **Region-basert nedlasting**: Brukeren kan velge geografiske områder
- **Progress tracking**: Nedlastingsfremdrift og estimert tid
- **Mapbox-integrasjon**: Tilkoblet for kartdata-sources

### ⚠️ Kjente Problemer
- TypeScript-feil i OfflineMapManager/Service (se `tsc_output.txt`)
- Inkonsistente interfaces (MapRegion vs OfflineMapRegion)
- UI-komponenter mangler for region-administrasjon

### 📚 Dokumentasjon
- **[OFFLINE_MAPS.md](OFFLINE_MAPS.md)** - Status, problemer og veien videre

### 🛠️ Veien Videre
1. **Fiks TypeScript-feil** - Standardiser interfaces og typer
2. **UI/UX-komponenter** - Region-selector og nedlastings-UI
3. **Testing** - Validering på iOS/Android devices
4. **Performance** - Optimalisering for store regioner

## 🔒 Sikkerhet

### 🎯 API-nøkler og Hemmeligheter

**⚠️ KRITISK: Aldri sjekk inn API-nøkler i git-repository**

### ✅ Riktig Praksis
- **Miljøvariabler**: `.env` filer (ikke commitet)
- **AsyncStorage**: Runtime-lagring av bruker-nøkler
- **Hosting-variabler**: Vercel Environment Variables, EAS secrets

### 🚨 Ved Lekkasje
1. **Roter nøkkel umiddelbart** i OpenAI/Google/Mapbox
2. **Fjern fra kode** og commit nye versjoner
3. **Rens git-historikk** (valgfritt, se SECURITY.md)

### 📚 Dokumentasjon
- **[SECURITY.md](../../SECURITY.md)** - Komplett sikkerhetspolicy

### 🔧 Verktøy
```bash
# Scan for hemmeligheter
pip install trufflehog
trufflehog git file://. --json
```

## Kjente byggtips

- Hvis release build feiler i bundling/minify: deaktiver enableMinify/enableProguard/enableShrinkResources i app.json sin expo-build-properties for feilsøk. Aktiver igjen når stabilt.
