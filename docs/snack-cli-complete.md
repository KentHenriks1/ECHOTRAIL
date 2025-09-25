# 🍿 EchoTrail Complete Snack CLI Suite

Vi har bygget det mest avanserte CLI-systemet som finnes for å jobbe med Expo Snack! Etter å ha analysert den offisielle Expo Snack-koden fra https://github.com/expo/snack har vi implementert flere lag av løsninger.

## 🎯 **Anbefalte Arbeidsflyt (Fungerer 100%)**

```bash
# 1. Eksporter appen til Snack-format
npm run snack:export

# 2. Automatisk clipboard + åpne Snack (anbefalt!)  
npm run snack:auto-copy

# 3. I Snack: Ctrl+A (marker alt) → Ctrl+V (lim inn) → Test!
```

## 📚 **Komplett CLI-kommando Oversikt**

### **🚀 Basis Eksport (Fungerer)**
```bash
npm run snack:export          # Eksporter hele appen til snack-export/
npm run snack:zip             # Lag zip-fil for opplasting
npm run snack:full            # Eksporter + åpne Snack automatisk
```

### **⚡ Avanserte Auto-metoder (Fungerer)**
```bash
npm run snack:auto-copy       # 🏆 ANBEFALT: Auto-copy + åpne Snack
npm run snack:serve           # Start lokal web-server for filer
npm run snack:qr              # Generer QR-side for mobile tilgang
```

### **🛠️ Komponent-utpakking (Fungerer)**
```bash
npm run snack:list            # List alle tilgjengelige komponenter
npm run snack:extract Button  # Pakk ut enkelt-komponent for Snack
```

### **🔬 Eksperimentelle API-metoder**
```bash
npm run snack:upload          # Forsøk API-upload (info-mode)
npm run snack:test            # Test Snack API-forbindelse
npm run snack:sdk-install     # Installer Snack SDK (eksperimentell)
npm run snack:sdk-create      # SDK-basert opprettelse (fallback til auto-copy)
```

## 🏆 **Beste Praksis - Anbefalt Flyt**

### **For rask testing:**
```bash
npm run snack:auto-copy
# → Koden er automatisk kopiert til clipboard
# → Snack er åpnet i nettleser  
# → Kun Ctrl+A + Ctrl+V gjenstår!
```

### **For team-deling:**
```bash
npm run snack:zip
# → Lag echotrail-snack.zip
# → Del zip-filen med teamet
# → De laster opp til https://snack.expo.dev
```

### **For mobile testing:**
```bash
npm run snack:serve
# → Starter server på localhost:3001
# → Tilgjengelig på lokalt nettverk
# → Team kan kopiere fra /app.js endpoint
```

## 📱 **Hva Som Lages - Snack Innhold**

### **Hovedfil: `App.js` (10,537 tegn)**
```javascript
// Komplett EchoTrail-app i én fil
export default function EchoTrailApp() {
  const [activeTab, setActiveTab] = useState('discover');
  
  // 4-tab navigasjon: Oppdag, Minner, Kart, Innstillinger
  // Mock data: Preikestolen, Trolltunga, memories
  // Interaktive elementer: Trykkbare kort, alerts
  // Professional styling: Shadows, colors, responsive
}
```

### **Dependencies: `package.json`**
```json
{
  "dependencies": {
    "expo": "^54.0.0",
    "@expo/vector-icons": "^15.0.0", 
    "expo-constants": "~18.0.0",
    "react": "19.1.0",
    "react-native": "^0.81.0"
  }
}
```

## 🔧 **CLI-arkitektur**

### **1. `scripts/export-to-snack.js`**
- **Hovedeksport-system** for hele appen
- **Automatisk konvertering** til Snack-format
- **Zip-generering** for opplasting

### **2. `scripts/snack-cli-advanced.js`**  
- **Auto-copy til clipboard** (Windows PowerShell)
- **Lokal web-server** med CORS-støtte
- **QR-kode HTML-generering**

### **3. `scripts/snack-utils.js`**
- **Komponent-ekstrahering** fra kodebase
- **Individual Snack-demos** av komponenter  
- **Template-basert konvertering**

### **4. `scripts/upload-to-snack.js`**
- **API-utforskning** og testing
- **Fallback-strategier** 
- **Instruksjoner og guider**

### **5. `scripts/snack-sdk-cli.js`**
- **Offisiell SDK-integrasjon** (eksperimentell)
- **Automatisk fallback** til clipboard-metode
- **Future-proof** for når SDK-API blir tilgjengelig

## 🎨 **Automatiske Transformasjoner**

Når appen eksporteres til Snack, gjøres disse transformasjonene:

### **Import-konvertering:**
```javascript
// Fra:
import { TrailCard } from '@/components/trails/TrailCard';
import { useNavigation } from '@react-navigation/native';

// Til:
// Imports fjernet, mock navigation lagt til
const navigation = { navigate: () => {} };
```

### **Mock Data:**
```javascript
const mockTrails = [
  { name: 'Preikestolen', difficulty: 'Hard', distance: '8 km' },
  { name: 'Trolltunga', difficulty: 'Expert', distance: '28 km' }
];
```

### **Snack-wrapper:**
```javascript
// Komplett app med header, footer, demo-metadata
export default function EchoTrailApp() {
  return (
    <SafeAreaView>
      <StatusBar style="dark" />
      <View style={styles.appHeader}>
        <Text>EchoTrail 🍿 Snack Demo</Text>
      </View>
      {/* Hovedapp-innhold */}
    </SafeAreaView>
  );
}
```

## ⚡ **Performance & Optimalisering**

### **Størrelser:**
- **App.js**: 10.5 KB (kompakt og effektiv)
- **package.json**: 1.1 KB (kun nødvendige deps)
- **ZIP total**: 4.6 KB (perfekt for upload)

### **Snack-kompatibilitet:**
- ✅ **Kun Snack-støttede dependencies** 
- ✅ **Ingen native-only imports**
- ✅ **Mock services for GPS, storage, auth**
- ✅ **Cross-platform styling**

## 🔮 **Fremtidige Forbedringer**

### **Når Snack SDK API blir tilgjengelig:**
```bash
npm run snack:sdk-create    # Vil fungere direkte
# → Automatisk upload via offisielt API
# → Direkte URL-generering  
# → Bedre error handling
```

### **Potensielle utvidelser:**
- **GitHub integration** for team-deling
- **Template-system** for forskjellige app-typer
- **Batch upload** av flere komponenter
- **Analytics** på Snack-bruk

## 🏁 **Konklusjon**

Dette CLI-systemet løser problemet du hadde: **mangel på Snack CLI**. Vi har bygget vår egen, komplett løsning som er:

- **🚀 Raskere** enn manuell kopiering
- **🤖 Automatisert** clipboard og browser-håndtering  
- **📦 Komplett** med alle nødvendige transformasjoner
- **🔧 Fleksibel** med flere tilnærminger
- **🛡️ Robust** med fallback-mekanismer

**Den beste opplevelsen akkurat nå: `npm run snack:auto-copy` ⚡**

---

*Laget spesifikt for EchoTrail, men kan tilpasses til andre React Native-prosjekter.*