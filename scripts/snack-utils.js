#!/usr/bin/env node

/**
 * EchoTrail Snack Utilities
 * CLI-verktøy for å jobbe med Expo Snack fra terminalen
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SNACK_DEMO_DIR = path.join(__dirname, '..', 'snack-demo');
const COMPONENTS_DIR = path.join(__dirname, '..', 'src', 'components');
const SCREENS_DIR = path.join(__dirname, '..', 'src', 'screens');

const commands = {
  'create-demo': 'Opprett en Snack-demo basert på en komponent/screen',
  'list-components': 'List tilgjengelige komponenter for Snack-demo',
  'extract-component': 'Pakk ut en komponent for Snack-bruk',
  'open-snack': 'Åpne Expo Snack i nettleseren',
  'tunnel-start': 'Start lokal tunnel for live testing med Expo Go',
  'generate-qr': 'Generer QR-kode for testing på mobile enheter',
  'help': 'Vis denne hjelpeteksten'
};

function showHelp() {
  console.log(`
🍿 EchoTrail Snack CLI Utilities

Tilgjengelige kommandoer:
`);
  
  Object.entries(commands).forEach(([cmd, desc]) => {
    console.log(`  ${cmd.padEnd(20)} - ${desc}`);
  });
  
  console.log(`
Eksempler:
  node scripts/snack-utils.js list-components
  node scripts/snack-utils.js extract-component TrailCard
  node scripts/snack-utils.js tunnel-start
  node scripts/snack-utils.js open-snack

For mer info: https://snack.expo.dev
`);
}

function listComponents() {
  console.log('\n🎨 Tilgjengelige komponenter for Snack-demo:\n');
  
  // List komponenter
  if (fs.existsSync(COMPONENTS_DIR)) {
    const components = fs.readdirSync(COMPONENTS_DIR, { recursive: true })
      .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'))
      .filter(file => !file.includes('.test.') && !file.includes('.spec.'));
    
    console.log('📦 Komponenter:');
    components.forEach(comp => console.log(`  - ${comp}`));
  }
  
  // List screens
  if (fs.existsSync(SCREENS_DIR)) {
    const screens = fs.readdirSync(SCREENS_DIR)
      .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'))
      .filter(file => !file.includes('.test.') && !file.includes('.spec.'));
    
    console.log('\n📱 Screens:');
    screens.forEach(screen => console.log(`  - ${screen}`));
  }
  
  console.log('\n💡 Tips: Bruk "extract-component <navn>" for å pakke ut til Snack-format');
}

function extractComponent(componentName) {
  if (!componentName) {
    console.error('❌ Vennligst spesifiser komponentnavn');
    console.log('Eksempel: node scripts/snack-utils.js extract-component TrailCard');
    return;
  }
  
  // Finn komponent
  const possiblePaths = [
    path.join(COMPONENTS_DIR, `${componentName}.tsx`),
    path.join(COMPONENTS_DIR, `${componentName}.ts`),
    path.join(SCREENS_DIR, `${componentName}.tsx`),
    path.join(SCREENS_DIR, `${componentName}.ts`),
    path.join(COMPONENTS_DIR, 'trails', `${componentName}.tsx`),
    path.join(COMPONENTS_DIR, 'modern', `${componentName}.tsx`),
    path.join(COMPONENTS_DIR, 'maps', `${componentName}.tsx`),
  ];
  
  let componentPath = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      componentPath = possiblePath;
      break;
    }
  }
  
  if (!componentPath) {
    console.error(`❌ Finner ikke komponent: ${componentName}`);
    console.log('💡 Kjør "list-components" for å se tilgjengelige komponenter');
    return;
  }
  
  console.log(`\n🔍 Funnet komponent: ${componentPath}`);
  
  // Les komponent-fil
  const componentContent = fs.readFileSync(componentPath, 'utf8');
  
  // Opprett Snack-kompatibel versjon
  const snackContent = convertToSnackFormat(componentContent, componentName);
  
  // Lag output-fil
  const outputPath = path.join(SNACK_DEMO_DIR, `${componentName}-Snack.tsx`);
  fs.mkdirSync(SNACK_DEMO_DIR, { recursive: true });
  fs.writeFileSync(outputPath, snackContent);
  
  console.log(`✅ Snack-demo opprettet: ${outputPath}`);
  console.log(`\n📋 Neste steg:`);
  console.log(`1. Kopier innholdet fra ${outputPath}`);
  console.log(`2. Gå til https://snack.expo.dev`);
  console.log(`3. Lim inn koden og test på telefonen!`);
}

function convertToSnackFormat(content, componentName) {
  // Enkle transformasjoner for å gjøre koden Snack-kompatibel
  let snackContent = `// 🍿 Expo Snack Demo - ${componentName}
// Generert automatisk fra EchoTrail-prosjektet
// Kopier denne koden til https://snack.expo.dev

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Mock data for demo (replace with your own)
const mockData = {
  // Add your mock data here
};

`;
  
  // Fjern complex imports og erstatt med enklere varianter
  content = content
    .replace(/import.*from ['"]\.\.\/.*['"];?\n/g, '') // Fjern relative imports
    .replace(/import.*from ['"]@\/.*['"];?\n/g, '') // Fjern @ imports
    .replace(/import.*Theme.*\n/g, '') // Fjern theme imports
    .replace(/useNavigation\(\)/g, 'null') // Fjern navigation
    .replace(/navigation\./g, '// navigation.'); // Kommentér ut navigation calls
  
  snackContent += content;
  
  snackContent += `

// Eksporter som default for Snack
export default function ${componentName}SnackDemo() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>${componentName} Demo</Text>
        <Text style={styles.subtitle}>Fra EchoTrail-prosjektet</Text>
      </View>
      
      {/* Din komponent her */}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🚀 Test denne komponenten i Expo Snack
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
`;
  
  return snackContent;
}

function openSnack() {
  console.log('🍿 Åpner Expo Snack i nettleseren...');
  
  try {
    // Åpne Snack i standard nettleser
    const command = process.platform === 'win32' ? 'start' : 
                   process.platform === 'darwin' ? 'open' : 'xdg-open';
    
    execSync(`${command} https://snack.expo.dev`);
    console.log('✅ Expo Snack åpnet i nettleseren!');
  } catch (error) {
    console.error('❌ Kunne ikke åpne nettleser automatisk');
    console.log('🔗 Gå manuelt til: https://snack.expo.dev');
  }
}

function startTunnel() {
  console.log('🚇 Starter Expo tunnel for live testing...');
  console.log('💡 Dette lar deg teste EchoTrail fra hvor som helst i verden!');
  
  try {
    console.log('\n🔄 Kjører: expo start --tunnel --go');
    console.log('📱 Scan QR-koden med Expo Go-appen når den vises');
    console.log('⏹️  Trykk Ctrl+C for å stoppe tunnelen\n');
    
    execSync('npx expo start --tunnel --go', { stdio: 'inherit' });
  } catch (error) {
    if (error.status !== 130) { // 130 er Ctrl+C exit code
      console.error('❌ Feil ved start av tunnel:', error.message);
      console.log('\n💡 Alternative kommandoer:');
      console.log('  npm run start           - Lokal utvikling');
      console.log('  npm run android:go      - Android med Expo Go');
      console.log('  npx expo start --lan    - LAN-tilkobling');
    }
  }
}

function generateQR() {
  console.log('📱 Genererer QR-kode for mobile testing...');
  
  try {
    console.log('\n🔄 Starter Expo med QR-kode...');
    console.log('📱 Scan QR-koden med Expo Go eller kamera-appen');
    console.log('⏹️  Trykk Ctrl+C for å stoppe\n');
    
    execSync('npx expo start --go', { stdio: 'inherit' });
  } catch (error) {
    if (error.status !== 130) {
      console.error('❌ Kunne ikke generere QR-kode:', error.message);
    }
  }
}

// Hovedfunksjon
function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'create-demo':
      console.log('🚧 create-demo kommer snart...');
      break;
    case 'list-components':
    case 'list':
      listComponents();
      break;
    case 'extract-component':
    case 'extract':
      extractComponent(arg);
      break;
    case 'open-snack':
    case 'open':
      openSnack();
      break;
    case 'tunnel-start':
    case 'tunnel':
      startTunnel();
      break;
    case 'generate-qr':
    case 'qr':
      generateQR();
      break;
    case 'help':
    case '-h':
    case '--help':
    default:
      showHelp();
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  listComponents,
  extractComponent,
  openSnack,
  startTunnel,
  generateQR
};