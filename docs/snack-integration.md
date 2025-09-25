# 🍿 Expo Snack Integration

EchoTrail har innebygd støtte for å jobbe med Expo Snack gjennom vår custom CLI. Dette lar deg enkelt teste og dele komponenter via Snack's webbaserte editor.

## Hurtigstart

```bash
# Vis hjelpemeny
npm run snack

# List tilgjengelige komponenter
npm run snack:list

# Pakk ut en komponent for Snack
npm run snack:extract TrailCard

# Åpne Expo Snack i nettleser
npm run snack:open
```

## Tilgjengelige kommandoer

### `npm run snack:list`
Lister alle tilgjengelige komponenter og screens som kan pakkes ut for bruk i Snack.

### `npm run snack:extract <komponent-navn>`
Pakker ut en spesifikk komponent og konverterer den til Snack-kompatibelt format.

Eksempel:
```bash
npm run snack:extract TrailCard
```

Dette vil:
1. Finne komponenten i prosjektet
2. Konvertere den til Snack-kompatibelt format
3. Fjerne komplekse imports og dependencies
4. Lagre resultatet i `snack-demo/` mappen
5. Gi instruksjoner for hvordan bruke koden i Snack

### `npm run snack:open`
Åpner Expo Snack i din standard nettleser.

### `npm run snack:tunnel`
Starter en Expo tunnel for live testing fra hvor som helst i verden.

### `npm run snack:qr`
Genererer QR-kode for testing på mobile enheter.

## Arbeidsflyt

1. **Utvikle komponent lokalt** i EchoTrail
2. **Test grundig** med TypeScript, linter, og tester
3. **Pakk ut for Snack**: `npm run snack:extract MittKomponent`
4. **Åpne Snack**: `npm run snack:open`
5. **Lim inn koden** fra den genererte filen
6. **Test på telefon** via Expo Go-appen
7. **Del med andre** via Snack's delefunksjon

## Eksempel: Pakke ut TrailCard

```bash
# 1. List tilgjengelige komponenter
npm run snack:list

# 2. Pakk ut TrailCard
npm run snack:extract TrailCard

# 3. Åpne Snack
npm run snack:open

# 4. Lim inn innholdet fra snack-demo/TrailCard-Snack.tsx
```

## Automatiske transformasjoner

Når en komponent pakkes ut for Snack, gjøres følgende transformasjoner automatisk:

- **Fjerner komplekse imports**: `@/components`, relative paths, theme imports
- **Erstatter navigation**: `useNavigation()` → `null`
- **Kommenterer ut navigation calls**: `navigation.navigate()` → `// navigation.navigate()`
- **Legger til mock data**: Placeholder for test-data
- **Wraps i demo-komponent**: Med header og footer for testing

## Live testing

For å teste komponenter live på telefon mens du utvikler:

```bash
# Start tunnel (tilgjengelig fra hvor som helst)
npm run snack:tunnel

# Eller generer QR for lokal testing
npm run snack:qr
```

## Tips og triks

### Komponenter som fungerer best i Snack
- Enkle UI-komponenter
- Stateless komponenter
- Komponenter uten komplekse dependencies
- Visuell komponenter (kort, knapper, lister)

### Komponenter som kan trenge tilpasning
- Navigation-avhengige komponenter
- Components med eksterne API-kall
- Komponenter med native dependencies
- Store, komplekse screens

### Mock data
Legg til mock data i den genererte Snack-filen for bedre testing:

```javascript
const mockData = {
  trail: {
    id: '1',
    name: 'Preikestolen',
    difficulty: 'hard',
    distance: '8 km'
  }
};
```

## Deling og samarbeid

1. **Etter testing i Snack**: Bruk "Save" og "Share" funksjonene
2. **Del URL**: Send Snack-URL til teammedlemmer for tilbakemelding
3. **QR-kode**: La andre teste direkte på telefon via QR
4. **Embed**: Snacks kan embeddes i dokumentasjon eller presentasjoner

## Feilsøking

### "Komponent ikke funnet"
- Sjekk at komponenten eksisterer: `npm run snack:list`
- Kontroller navn og sti
- Sørg for at filen har riktig extension (.tsx/.ts)

### "Import errors i Snack"
- Generer komponenten på nytt: `npm run snack:extract KomponentNavn`
- Sjekk at alle eksterne dependencies er tilgjengelige i Snack
- Legg til manglende imports manuelt i Snack

### "Navigation ikke fungerer"
- Dette er forventet - navigation blir automatisk deaktivert
- Test navigasjon i hovedappen, bruk Snack for UI-testing

## Integrere med utviklingsworkflow

```bash
# Typisk utviklingsworkflow
npm run qa              # Kvalitetskontroll
npm run snack:extract MyComponent  # Pakk ut for testing
npm run snack:open      # Test i Snack
```

Snack-integrasjonen er designet for å være en natural del av utviklingsprosessen, ikke en separat workflow. Bruk det for rask prototyping, visuell testing, og deling av komponenter med andre.