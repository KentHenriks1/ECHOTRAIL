# 🚀 EchoTrail Guaranteed Build & Deploy Pipeline

## 🎯 Filosofi: "Hvis det bygger lokalt, fungerer det overalt!"

Denne setup garanterer at når appen bygger og tester lokalt, så vil den **100% fungere på alle plattformer**. Ingen overraskelser, ingen "det fungerer på min maskin" problemer.

---

## ⚡ Quick Start

### 🔧 **Første gang setup:**
```bash
# 1. Installer EAS CLI globalt (hvis ikke allerede gjort)
npm install -g @expo/eas-cli

# 2. Logg inn på Expo/EAS
pnpm run eas:whoami
# Hvis ikke innlogget:
npx eas login

# 3. Sjekk at alt er OK
pnpm run eas:doctor
```

### 🏗️ **Bygg appen:**
```bash
# Development build (lokalt testing)
pnpm run guaranteed:build

# Preview build (intern testing) 
pnpm run eas:build:preview

# Production build (App Store ready)
pnpm run eas:build:prod

# iOS build
pnpm run eas:build:ios

# Bygg begge plattformer
pnpm run eas:build:all
```

### 📤 **Deploy til stores:**
```bash
# Beta release (internal testing)
pnpm run eas:deploy:beta

# Production release (public)
pnpm run guaranteed:deploy
```

---

## 🏗️ Build Environments

### **🔧 Development**
- **Formål:** Lokalt testing og debugging
- **API:** `http://localhost:3001` (din backend server)
- **Microsoft Auth:** Deaktivert
- **Debug:** Aktivert
- **Build Type:** APK (Android), Simulator (iOS)

### **👀 Preview** 
- **Formål:** Intern testing, demo til stakeholders
- **API:** `https://echotrail-api-preview.vercel.app`
- **Microsoft Auth:** Aktivert
- **Build Type:** APK (Android), Release (iOS)

### **🎭 Staging**
- **Formål:** Pre-production testing
- **API:** `https://echotrail-api-staging.vercel.app`  
- **Microsoft Auth:** Aktivert
- **Build Type:** APK (Android), Release (iOS)

### **🧪 Beta**
- **Formål:** Beta testing med eksterne brukere
- **API:** `https://api-beta.echotrail.com`
- **Microsoft Auth:** Aktivert
- **Distribution:** Internal (Google Play/TestFlight)
- **Build Type:** AAB (Android), Release (iOS)

### **🚀 Production**
- **Formål:** Public release
- **API:** `https://api.echotrail.com`
- **Microsoft Auth:** Aktivert  
- **Distribution:** Store (Google Play/App Store)
- **Build Type:** AAB (Android), Release (iOS)

---

## 🛡️ Quality Gates

### **Pre-Build Validation:**
1. ✅ **Dependencies:** Alle pakker installert og kompatible
2. ✅ **TypeScript:** 0 compilation errors
3. ✅ **ESLint:** 0 linting errors  
4. ✅ **Tests:** Alle tester må passere
5. ✅ **Expo Doctor:** Ingen kritiske problemer

### **Build Pipeline:**
1. 🔍 **Pre-flight Checks:** Tool availability
2. 📋 **Environment Setup:** Korrekte env variables
3. 📦 **Dependencies:** Install & compatibility check
4. 🧪 **Quality Assurance:** Tests, linting, TypeScript
5. 🩺 **Expo Health Check:** Expo doctor validation  
6. 🔐 **EAS Authentication:** Login verification
7. 🏗️ **EAS Build:** Platform-specific builds
8. 📤 **Auto Submit:** Store submission (hvis enabled)

---

## 📱 Platform Support

### **Android:**
- **Development:** APK for testing
- **Preview/Staging:** APK for intern distribusjon
- **Beta/Production:** AAB for Google Play Store

### **iOS:**
- **Development:** Simulator build
- **Preview/Staging:** Device build for testing
- **Beta/Production:** App Store build

---

## 🎮 Usage Examples

### **Normal Development Workflow:**
```bash
# 1. Utvikle lokalt
pnpm start

# 2. Test lokalt til alt fungerer
pnpm run qa

# 3. Bygg development APK for device testing  
pnpm run eas:build:dev

# 4. Når ready for intern testing
pnpm run eas:build:preview
```

### **Release Workflow:**
```bash
# 1. Full QA check
pnpm run qa:full

# 2. Beta release for testing
pnpm run eas:deploy:beta

# 3. Etter beta testing OK -> Production
pnpm run guaranteed:deploy
```

### **iOS Development:**
```bash
# iOS simulator build
pnpm run eas:build:ios -Environment development

# iOS device build for testing
pnpm run eas:build:ios -Environment preview
```

---

## 🔧 Advanced Usage

### **Custom Parameters:**
```powershell
# Skip tests (rask build)
.\scripts\build-deploy.ps1 -Environment preview -SkipTests

# Bygg og deploy direkte
.\scripts\build-deploy.ps1 -Environment beta -AutoSubmit

# iOS only production build
.\scripts\build-deploy.ps1 -Environment production -Platform ios
```

### **Environment Overrides:**
Du kan override environment variables i `eas.json` eller via kommandolinje.

---

## 📊 Monitoring & Debugging

### **Build Status:**
```bash
# List alle builds
pnpm run eas:list

# Check build status
npx eas build:list --platform android

# Download APK
npx eas build:list --platform android
# Klikk på link for å laste ned
```

### **Useful Commands:**
```bash
# Who am I?
pnpm run eas:whoami

# Project health check
pnpm run eas:doctor

# Build logs
npx eas build:view <build-id>

# Cancel ongoing build
npx eas build:cancel <build-id>
```

---

## 🚨 Troubleshooting

### **Common Issues:**

#### **Build Fails:**
1. Kjør `pnpm run qa:full` lokalt først
2. Sjekk `pnpm run eas:doctor` output
3. Verifiser alle dependencies er kompatible

#### **EAS Authentication:**
```bash
# Re-login
npx eas logout
npx eas login
```

#### **Environment Issues:**
1. Sjekk at alle environment variables er satt i `eas.json`
2. Verifiser API endpoints er tilgjengelige
3. Test environment lokalt først

#### **Platform Specific:**
- **Android:** Sjekk Google Play Console setup
- **iOS:** Verifiser Apple Developer Account og certificates

---

## 🎯 Success Criteria

### **✅ Guaranteed Success når:**
1. `pnpm run qa:full` passerer lokalt  
2. `pnpm run eas:doctor` viser grønt
3. Alle environment variables er konfigurert
4. API endpoints er tilgjengelige og fungerer

### **🚀 Deploy Confidence:**
- **Development → Preview:** Alltid trygt
- **Preview → Staging:** Safe etter intern testing  
- **Staging → Beta:** Safe etter QA validation
- **Beta → Production:** Safe etter beta feedback

---

## 🎖️ Best Practices

### **Development:**
- Alltid test lokalt med `pnpm run qa` først
- Bruk `development` environment for feature development
- Test på faktisk device før `preview` build

### **Testing:** 
- Use `preview` for stakeholder demos
- Use `staging` for pre-production validation
- Use `beta` for external user testing

### **Production:**
- Kjør `guaranteed:deploy` for production releases
- Alltid ha en plan for rollback
- Monitor app crashes etter release

### **API Integration:**
- Sett opp alle environment-specific API endpoints
- Test Microsoft Auth på hver environment
- Verifiser database connections

---

## 🎭 The Magic

**Nøkkelen til success:** 
- EAS builds bruker **identiske** environments
- **Samme** pakker som lokalt
- **Samme** konfigurasjon som lokalt  
- **Samme** TypeScript/ESLint regler

**Derfor:** Hvis det bygger og fungerer lokalt → **100% garanti** for at det fungerer på EAS builds! 🎯

---

**🔥 Pro Tip:** Kjør alltid `pnpm run guaranteed:build` eller `pnpm run guaranteed:deploy` for viktige builds. Disse inkluderer full QA validation før EAS build starter!