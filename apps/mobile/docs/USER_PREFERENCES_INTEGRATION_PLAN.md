# 🎯 Brukerpreferanse-Integrasjon Plan
**EchoTrail - Personlig Stemning og Interesser**

*Author: Kent Rune Henriksen*  
*Email: Kent@zentric.no*  
*Date: 2025-01-25*

## 📋 Oversikt

Dette dokumentet beskriver hvordan vi integrerer brukerpreferanser (interesser, humør, stemning) i EchoTrail-appen for å gi enda mer personaliserte AI-genererte historier.

## 🎨 Frontend Design Konsept

### **Hovedkategorier for Preferanser:**

#### 1. **🌟 Interesser (Permanente Preferanser)**
- 📚 Historie & Kultur
- 🏛️ Arkitektur & Byggverk  
- 🌿 Natur & Miljø
- 🎭 Kunst & Kreativitet
- ⚽ Sport & Aktiviteter
- 🍽️ Mat & Drikke
- 🎶 Musikk & Performance
- 🔬 Vitenskap & Teknologi
- 👥 Sosialt & Samfunn
- ✨ Mystikk & Folklore

#### 2. **😊 Humør/Stemning (Dynamiske Preferanser)**
- 😊 Glad og energisk
- 🧘 Rolig og avslappet  
- 🤔 Nysgjerrig og lærende
- 😮 Eventyrlysten og dristig
- 💭 Reflekterende og dyptænkende
- 🎉 Sosial og utadvendt
- 🌅 Inspirert og kreativ
- 😌 Nostalgisk og romantisk
- 🔥 Motivert og målrettet
- 🌙 Melankolsk og poetisk

## 🔧 Teknisk Implementering

### **Frontend Komponenter:**

```tsx
interface UserPreferences {
  interests: {
    [key: string]: number; // "historie": 8, "natur": 9
  };
  
  currentMood: {
    energy: number;      // 1-10
    curiosity: number;   // 1-10
    social: number;      // 1-10
    adventure: number;   // 1-10
    reflection: number;  // 1-10
  };
  
  contextual: {
    preferredStoryLength: 'kort' | 'medium' | 'lang';
    voiceStyle: 'vennlig' | 'mystisk' | 'energisk' | 'rolig';
    complexityLevel: 'enkel' | 'moderat' | 'avansert';
  };
}
```

## 🤖 AI-System Integrasjon

### **Oppdatert Beslutningsflyt:**

1. **KONTEKSTANALYSE**
   - Lokasjon (GPS, adresse)
   - Tid og værforhold  
   - **Brukerpreferanser (interesser + stemning)** ← NY
   - Sosial kontekst

2. **PREFERANSE-EVALUERING** ← NY STEG
   - Match interesser med lokasjon (relevanscore)
   - Tilpass til nåværende stemning
   - Vekt historisk suksess
   - Juster kompleksitetsnivå

3. **AI-STRATEGI SELEKSJON**
   - Claude (kulturell + stemningsbasert)
   - GPT-4 (balansert + interesse-optimalisert)
   - Hybrid (kompleks stemning + interesser)
   - Offline (cached + preferanse-match)

## 🎯 Implementeringsfaser

### **Fase 1: Grunnleggende Preferanser**
- [x] Planlegg arkitektur og design
- [ ] Implementer PreferenceSetupScreen
- [ ] Integrer med IntelligentContextSelector
- [ ] Test med eksisterende AI-system

### **Fase 2: Dynamisk Tilpasning** 
- [ ] QuickMoodSelector widget
- [ ] Kontekstuell auto-deteksjon
- [ ] Preferanse-påvirket prompt-generering

### **Fase 3: Smart Læring**
- [ ] AI-drevne preferanseforslag
- [ ] Mønstergjenkjenning og tilpasning
- [ ] Avansert personalisering

## 🚀 Forventede Resultater

- ⬆️ 25% økning i bruker-tilfredshet
- ⬆️ 35% økning i session-lengde  
- ⬆️ 40% økning i gjentakende bruk
- ⬇️ 50% reduksjon i "skip story" rate