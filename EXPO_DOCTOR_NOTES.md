# Expo Doctor - Konfigurasjonsnotater

## Status: 16/17 Sjekker Passerer ✅

Dato: 2025-09-21
Expo SDK: 54.0.7
Expo Doctor: 1.17.8

## ⚠️ Kjent Varsel: App Config Fields Sync Issue

### Problem
```
✖ Check for app config fields that may not be synced in a non-CNG project
This project contains native project folders but also has native configuration properties in app.json, 
indicating it is configured to use Prebuild. When the android/ios folders are present, EAS Build will 
not sync the following properties: orientation, icon, userInterfaceStyle, splash, ios, android, plugins, scheme.
```

### Årsak
Prosjektet har både:
- Native mapper (`android/` og `ios/`)
- Konfigurasjonsegenskaper i `app.json`

Dette skaper en hybrid-tilstand hvor EAS Build ikke automatisk synkroniserer visse konfigurasjonsendringer.

### Løsning for fremtidige endringer

**VIKTIG:** Hvis du endrer noen av disse feltene i `app.json`:
- `orientation`
- `icon`
- `userInterfaceStyle`
- `splash`
- `ios`
- `android`
- `plugins`
- `scheme`

**MÅ du kjøre:**
```bash
npx expo prebuild --clean
```

Dette synkroniserer endringene fra `app.json` til native mappene.

### Eksempel-workflow når du endrer app.json

1. Rediger `app.json` (f.eks. endre app icon eller splash screen)
2. Kjør: `npx expo prebuild --clean`
3. Commit både `app.json` OG native folder-endringene
4. Test på både simulator og fysisk enhet

### Alternative løsninger

**Alternativ 1: Full Managed Workflow**
- Slett `android/` og `ios/` mappene
- Bruk kun `app.json` for konfigurasjon
- EAS Build håndterer native generering

**Alternativ 2: Full Bare Workflow**
- Fjern prebuild-konfigurasjonen fra `app.json`
- Gjør alle native endringer direkte i `android/`/`ios/`
- Mer manuelt arbeid, men full kontroll

## Fremtidige sjekker

Før deployment eller når du endrer konfigurasjon:
```bash
npx expo-doctor --verbose
```

Forvent at dette varselet alltid vil vises med mindre vi endrer prosjektstrukturen.