# EchoTrail APK Build Guide

## Aktuelle Utfordringer

- NPM workspace konfigurasjonsproblemer
- EAS Build krever Expo-konto
- Native Android build krever Android Studio setup

## Alternative Tilnærminger:

### 1. 🎯 **Expo Development Build (Anbefalt)**

```bash
# Installer Expo Development Build
npx create-expo --template

# Bygg development APK
eas build --platform android --profile development
```

### 2. 📱 **Expo Go Method**

Siden appen bruker Expo SDK, kan du:

1. Installere Expo Go app fra Google Play Store
2. Kjøre: `expo start`
3. Skann QR-kode med Expo Go

### 3. 🔧 **Local Native Build (Krever Android Studio)**

1. Installer Android Studio og Android SDK
2. Kjør: `npx expo run:android`
3. APK finnes i: `android/app/build/outputs/apk/debug/`

### 4. 📦 **APK Export Service**

Vi kan lage en enkel APK ved å:

1. Eksportere Expo bundle
2. Pakke som APK med online verktøy
3. Eller bruke Expo Application Services

## Neste Steg:

1. Fikse NPM workspace konfigurasjonen
2. Alternativt: Bruke Expo Go for testing
3. Sett opp EAS Build account for produksjon APK
