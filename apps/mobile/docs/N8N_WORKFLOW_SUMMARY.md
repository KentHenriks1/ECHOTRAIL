# 🔄 N8N Workflow - EchoTrail User Preferences to AI Story Generation

*Author: Kent Rune Henriksen*  
*Email: Kent@zentric.no*

## 📋 Workflow Oversikt

Dette n8n workflow visualiserer den komplette prosessen fra brukerpreferanser til AI-generert historie i EchoTrail-appen.

## 🚀 Hovedflyt

### **1. Brukeroppstart**
- `🚀 User Opens EchoTrail` → Starter hele prosessen
- `🤔 First Time User?` → Sjekker om det er ny bruker

### **2. Preferanse-oppsett**

**For nye brukere:**
- `🌟 Velg Interesser (3-7)` → Interesse-seleksjon
- `😊 Sett Initial Stemning` → Humør-innstilling  
- `⚙️ Kontekstuell Tilpasning` → Preferanser

**For eksisterende brukere:**
- `📱 Last Lagrede Preferanser` → Henter lagrede data
- `🎯 Quick Mood Selector?` → Rask stemningsvalg
- `😊 Oppdater Stemning` → Justerer stemning

### **3. AI Beslutningsprosess**

#### **Analyse og Evaluering:**
- `🔍 1. Kontekstanalyse` → Lokasjon, tid, brukerdata
- `⚖️ 2. Preferanse-evaluering` → Matcher preferanser med kontekst

#### **Strategi-valg basert på kriterier:**
- `🏛️ Kulturell Relevans > 0.8?` → Høy kulturell relevans
  - **JA** → `🎭 Claude Strategy` (optimal kulturell nøyaktighet)
  - **NEI** → Fortsetter til interesse-evaluering

- `🎯 Høy Interesse-Match?` → Matcher brukerinteresser sterkt  
  - **JA** → `🔬 GPT-4 Interest-Optimized`
  - **NEI** → Evaluerer stemningskompleksitet

- `🌈 Kompleks Stemning?` → Kompleks humør/preferanse-kombinasjon
  - **JA** → `⚡ Hybrid Strategy` (Claude + GPT-4)
  - **NEI** → `🤖 GPT-4 Standard` (standard tilnærming)

### **4. Innholdsgenerering**

- `📝 Personaliert Prompt` → Tilpasser prompt til bruker
- `🎵 Stemning & Tone Tilpasning` → Justerer tone basert på humør  
- `✨ AI Historie-generering` → Generer historie med valgt AI-strategi
- `✅ Kvalitetsvalidering` → Validerer innholdskvalitet

### **5. Brukeropplevelse og Læring**

- `📖 Lever Historie til Bruker` → Presenterer ferdig historie
- `⭐ Bruker Ga Feedback?` → Sjekker om bruker ga tilbakemelding
  - **JA** → Læringsprosess:
    - `🧠 Oppdater Læringsprofil` → Justerer brukerprofil
    - `🎯 Juster Fremtidige Preferanser` → Optimaliserer for fremtiden
  - **NEI** → Hopper til caching

- `💾 Cache for Gjenbruk` → Lagrer for fremtidig bruk

### **6. Smart Optimalisering**

- `🤖 Foreslå Preferanse-endringer?` → AI-drevne forslag
  - **JA** → `💭 Vis Smart Forslag` → Foreslår preferanse-justeringer
  - **NEI** → Avslutter syklus

- `🎉 Fullført Syklus` → Prosess komplett

## 🎯 Beslutningslogikk

### **AI Strategi-valg:**

1. **Claude Primary** (🎭)
   - Trigger: Kulturell relevans > 0.8
   - Styrke: Optimal kulturell nøyaktighet og kontekstuell forståelse

2. **GPT-4 Interest-Optimized** (🔬)
   - Trigger: Høy interesse-match (> 0.7)
   - Styrke: Skreddersydd innhold basert på spesifikke interesser

3. **Hybrid Strategy** (⚡)
   - Trigger: Kompleks stemning eller mange preferanse-dimensjoner
   - Styrke: Kombinerer Claude's kulturelle innsikt med GPT-4's allsidighet

4. **GPT-4 Standard** (🤖)
   - Trigger: Standard scenario uten spesielle krav
   - Styrke: Pålitelig, balansert kvalitet

## 📊 Datapunkter i Workflow

### **Brukerpreferanser:**
- `interests`: Kategoriserte interesser (1-10 skala)
- `currentMood`: Energi, nysgjerrighet, sosial, eventyr, refleksjon
- `contextual`: Historielengde, stemmestil, kompleksitetsnivå

### **Situasjonsdata:**
- `location`: GPS, adresse, närområde
- `temporal`: Tid, sesong, værforhold
- `social`: Alene/gruppe, sosial kontekst

### **AI Beslutningsmetrikker:**
- `culturalRelevance`: 0-1 kulturell relevanscore
- `interestMatchScore`: 0-1 interesse-match poeng
- `moodComplexity`: 0-1 stemningskompleksitet

## 🔄 Kontinuerlig Forbedring

Workflow-en inkluderer feedback-loops for:
- **Brukerlæring**: Justerer profil basert på interaksjoner
- **AI-optimalisering**: Forbedrer strategivalg over tid  
- **Cache-intelligens**: Lærer hvilke historier som fungerer best
- **Prediktive forslag**: AI foreslår preferanse-justeringer

## 🚀 Implementering

Dette workflow-et kan importeres direkte til n8n og brukes som:
1. **Visualiseringsverktøy** for å forstå kompleksiteten
2. **Implementeringsguide** for utviklere
3. **Testing og debugging** av beslutningslogikk
4. **Dokumentasjon** for stakeholders

Workflow-en demonstrerer hvordan EchoTrail balanserer personalisering, AI-kvalitet og brukeropplevelse i en sammenhengende, intelligent prosess.