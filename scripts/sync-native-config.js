#!/usr/bin/env node

/**
 * Script for å synkronisere app.json endringer til native mapper
 * Bruk dette scriptet når du har endret kritiske felter i app.json
 * 
 * Kjør: node scripts/sync-native-config.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Synkroniserer app.json konfiguration til native mapper...\n');

// Sjekk at vi er i riktig directory
const appJsonPath = path.join(process.cwd(), 'app.json');
if (!fs.existsSync(appJsonPath)) {
  console.error('❌ Finner ikke app.json. Kjør scriptet fra prosjektets rot-directory.');
  process.exit(1);
}

// Sjekk at native mapper eksisterer
const androidDir = path.join(process.cwd(), 'android');
const iosDir = path.join(process.cwd(), 'ios');

if (!fs.existsSync(androidDir) && !fs.existsSync(iosDir)) {
  console.log('ℹ️  Ingen native mapper funnet. Ingen synkronisering nødvendig.');
  process.exit(0);
}

try {
  console.log('📱 Kjører expo prebuild --clean...');
  console.log('ℹ️  Expo kan spørre om uncommitted changes - det er trygt å fortsette.\n');
  
  execSync('npx expo prebuild --clean', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('\n✅ Native konfiguration synkronisert!');
  console.log('\n📋 Neste steg:');
  console.log('1. Test appen på simulator/enhet');
  console.log('2. Commit endringene i både app.json og native mapper');
  console.log('3. Kjør "npx expo-doctor" for å verifisere');

} catch (error) {
  console.error('\n❌ Feil under synkronisering:');
  console.error(error.message);
  
  console.log('\n🛠️  Prøv å løse problemet:');
  console.log('1. Sjekk at Expo CLI er installert: npm install -g @expo/cli');
  console.log('2. Sjekk at app.json er gyldig JSON');
  console.log('3. Se EXPO_DOCTOR_NOTES.md for mer hjelp');
  
  process.exit(1);
}