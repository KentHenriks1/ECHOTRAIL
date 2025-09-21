# 🔄 Native Konfigurasjon Synkronisering

Dette prosjektet bruker en hybrid-tilnærming med både `app.json` og native mapper (`android/`/`ios/`).

## ⚠️ VIKTIG: Når du endrer app.json

Hvis du endrer noen av disse feltene i `app.json`:

- ✏️ `orientation`
- 🖼️ `icon` 
- 🎨 `userInterfaceStyle`
- 📱 `splash`
- 🍎 `ios`
- 🤖 `android`
- 🔌 `plugins`
- 🔗 `scheme`

**MÅ du synkronisere endringene:**

### Metode 1: Bruk vårt script (anbefalt)
```bash
npm run sync-native
```

### Metode 2: Manuelt
```bash
npx expo prebuild --clean
```

## 🧪 Test alltid etter synkronisering

1. **Simulator/Emulator:**
   ```bash
   npm run ios     # iOS Simulator
   npm run android # Android Emulator
   ```

2. **Fysisk enhet:**
   ```bash
   npm run android:go # Android via Expo Go
   # iOS via Expo Go: Scan QR kode
   ```

3. **Verifiser med Expo Doctor:**
   ```bash
   npx expo-doctor
   ```

## 📋 Commit Checklist

Når du har endret app.json og synkronisert:

- [ ] ✅ app.json endringer committet
- [ ] ✅ Native mapper endringer committet (android/ios)
- [ ] ✅ Testet på simulator/enhet
- [ ] ✅ `npx expo-doctor` kjørt (forventer 16/17 passed)
- [ ] ✅ `npm run typecheck` passerer
- [ ] ✅ `npm run test` passerer

## 🔍 Kjente Expo Doctor Varsler

Expo Doctor vil alltid vise dette varselet:
```
✖ Check for app config fields that may not be synced in a non-CNG project
```

Dette er **normalt** og **ikke et problem** - se `EXPO_DOCTOR_NOTES.md` for detaljer.

## 🆘 Feilsøking

**Problem:** `expo prebuild` feiler
**Løsning:** 
1. Sjekk at `app.json` er gyldig JSON
2. Sjekk at du har riktige permissions til å skrive i native mapper
3. Slett `android/` og `ios/` mapper og kjør på nytt

**Problem:** Endringer vises ikke i appen
**Løsning:**
1. Sjekk at du faktisk kjørte synkroniseringen
2. Restart Metro bundler: `npm start` -> `r`
3. Clean build på native: `npx expo run:android --clear-cache`