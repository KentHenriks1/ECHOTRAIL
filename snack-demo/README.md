# 🍿 EchoTrail × Expo Snack Demo

## 🎯 Hva er dette?

Dette er en forenklet versjon av EchoTrail-komponenter som kan kjøres direkte i **Expo Snack** for rask prototyping og deling.

## 🚀 Slik bruker du Expo Snack med EchoTrail

### Steg 1: Åpne Expo Snack
1. Gå til [https://snack.expo.dev](https://snack.expo.dev)
2. Klikk **"New Snack"**
3. Velg **"SDK 54"** (matcher EchoTrail-prosjektet)

### Steg 2: Kopier demo-koden
1. Åpne `EchoTrail-Demo.tsx` i denne mappen
2. Kopier **hele** innholdet
3. Lim inn i Snack-editoren (erstatt eksisterende kode)

### Steg 3: Test på telefonen
1. Last ned **Expo Go** app på telefonen din:
   - [iOS App Store](https://apps.apple.com/us/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Scan QR-koden som vises i Snack
3. Se EchoTrail-demo kjøre live på telefonen! 📱

## 🎨 Hva kan du teste i demoen?

### ✅ Komponenter som fungerer:
- **TrailCard** - Viser turinfo med AI-guide-indikator
- **Responsive design** - Tilpasser seg forskjellige skjermstørrelser  
- **MaterialIcons** - Alle ikoner fungerer perfekt
- **TouchableOpacity** - Interaktivt design
- **ScrollView** - Smooth scrolling
- **Styled components** - Moderne design system

### 🎯 Features demonstrert:
- **Trail-listing** - Viser forskjellige vanskelighetsgrader
- **Stats formatting** - Distanse, tid, høydegain, rating
- **Difficulty badges** - Fargekodede badges
- **Audio guide indicators** - AI-guide ikoner
- **Feature grid** - EchoTrail's hovedfunksjoner

## 📱 Bruksområder for Snack

### 🔥 For utvikling:
1. **Rask prototyping** - Test nye UI-ideer
2. **Component testing** - Isoler og test enkelt-komponenter
3. **Design validation** - Se hvordan det ser ut på ekte mobil
4. **Code sharing** - Send lenke til teammedlemmer
5. **Client demos** - Vis funksjonalitet til kunder

### 🛠️ For EchoTrail spesifikt:
1. **Trail card designs** - Test forskjellige kort-layouts
2. **Color schemes** - Eksperimenter med farger
3. **Icon testing** - Prøv ut nye ikoner
4. **Layout adjustments** - Juster spacing og sizing
5. **Mobile UX** - Valider brukeropplevelse på mobil

## 🔗 Nyttige Snack-kommandoer

### Hurtigtaster:
- **Ctrl/Cmd + S** - Lagre og oppdater
- **Ctrl/Cmd + R** - Restart app
- **Ctrl/Cmd + Shift + R** - Clear cache og restart

### Tips:
- **Live reload** - Endringer vises øyeblikkelig
- **Console logging** - `console.log()` vises i Snack
- **Error handling** - Feil vises direkte i appen
- **Multiple devices** - Samme QR-kode fungerer på flere enheter

## 📦 Tilgjengelige pakker i Snack

EchoTrail bruker disse pakkene som **alle** er tilgjengelige i Snack:

```javascript
// ✅ Expo SDK 54 pakker (alle støttet)
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Camera from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ React Navigation (støttet)
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

// ✅ React Native komponenter (alle støttet)
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
```

## 🚀 Neste steg

### Fra Snack til full app:
1. **Prototype i Snack** - Utvikle og test ideer
2. **Eksporter kode** - Kopier tilbake til hovedprosjektet
3. **Integrer services** - Koble til database og API
4. **Test lokalt** - `npm run android` / `npm run ios`
5. **Deploy til EAS** - `npm run eas:build`

### Del Snack-en din:
1. **Klikk "Save"** i Snack-editoren
2. **Kopier URL** - Del lenken med teamet
3. **Embed** - Legg til i dokumentasjon
4. **QR-kode** - Del for direkte testing

## 💡 Pro Tips

### For best resultat:
1. **Start enkelt** - Begynn med én komponent
2. **Mock data** - Bruk statiske data for rask testing
3. **Incremental** - Legg til én feature om gangen
4. **Real device testing** - Test alltid på ekte mobil
5. **Share early** - Få tilbakemelding tidlig i prosessen

### Performance tips:
- Unngå heavy computation i Snack
- Bruk mock-data i stedet for API-kall
- Hold komponenter enkle for bedre ytelse
- Test på forskjellige enheter og skjermstørrelser

---

**🎉 Klar til å teste EchoTrail i Expo Snack!**

Kopier `EchoTrail-Demo.tsx` til [snack.expo.dev](https://snack.expo.dev) og scan QR-koden med Expo Go-appen din!