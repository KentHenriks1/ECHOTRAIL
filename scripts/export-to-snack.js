#!/usr/bin/env node

/**
 * EchoTrail Full App Export to Snack
 * Eksporterer hele appen til Snack-kompatibelt format
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const EXPORT_DIR = path.join(PROJECT_ROOT, 'snack-export');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const APP_DIR = path.join(SRC_DIR, 'app');

// Files som skal inkluderes direkte
const INCLUDE_FILES = [
  'app.json',
  'package.json'
];

// Dependencies som er kompatible med Snack
const SNACK_COMPATIBLE_DEPS = {
  "expo": "^54.0.0",
  "@expo/vector-icons": "^15.0.0",
  "expo-constants": "~18.0.0",
  "expo-linear-gradient": "^15.0.7",
  "expo-blur": "~15.0.7",
  "expo-haptics": "~15.0.7",
  "expo-audio": "~16.0.7",
  "expo-font": "~14.0.8",
  "@react-navigation/native": "^7.0.0",
  "@react-navigation/bottom-tabs": "^7.0.0",
  "@react-navigation/stack": "^7.4.8",
  "react-native-screens": "~4.16.0",
  "react-native-safe-area-context": "^5.0.0",
  "react-native-gesture-handler": "^2.25.0",
  "@react-native-async-storage/async-storage": "2.2.0",
  "i18next": "^25.4.2",
  "react-i18next": "^15.1.2",
  "react": "19.1.0",
  "react-native": "^0.81.0"
};

function showHelp() {
  console.log(`
🍿 EchoTrail Full App Export to Snack

Dette scriptet eksporterer hele EchoTrail-appen til Snack-kompatibelt format.

Kommandoer:
  export          - Eksporter hele appen til snack-export/
  create-zip      - Opprett zip-fil klar for opplasting
  open-snack      - Åpne Snack for manuell opplasting
  help            - Vis denne hjelpeteksten

Eksempler:
  node scripts/export-to-snack.js export
  node scripts/export-to-snack.js create-zip
  node scripts/export-to-snack.js open-snack

Merk: Snack har begrensninger på filstørrelse og antall filer.
Store apper må kanskje deles opp i mindre deler.
`);
}

function cleanDirectory(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function transformImports(content) {
  // Transformer imports til Snack-kompatible
  return content
    .replace(/from ['"]@\//g, 'from "./')
    .replace(/from ['"]\.\.\//g, 'from "./')
    .replace(/import.*from ['"][^'"]*\/native[^'"]*['"];?\n/g, '') // Fjern native-only imports
    .replace(/import.*from ['"]expo-router['"];?\n/g, '') // Fjern Expo Router
    .replace(/import.*from ['"]@react-native-community\/netinfo['"];?\n/g, '') // Fjern NetInfo
    .replace(/import.*from ['"]@sentry\/react-native['"];?\n/g, '') // Fjern Sentry
    .replace(/import.*from ['"]expo-updates['"];?\n/g, '') // Fjern Updates
    .replace(/import.*from ['"]expo-notifications['"];?\n/g, '') // Fjern Notifications
    .replace(/useNavigation\(\)/g, '{ navigate: () => {} }') // Mock navigation
    .replace(/navigation\./g, '// navigation.');
}

function createMockServices() {
  return `// Mock Services for Snack
export const AuthService = {
  login: async (email, password) => ({ user: { email, role: 'user' } }),
  logout: async () => {},
  getCurrentUser: () => ({ email: 'demo@snack.dev', role: 'user' })
};

export const LocationService = {
  getCurrentLocation: async () => ({ 
    latitude: 59.9139, 
    longitude: 10.7522, 
    altitude: 0 
  }),
  watchLocation: (callback) => {
    callback({ latitude: 59.9139, longitude: 10.7522 });
    return () => {};
  }
};

export const StorageService = {
  getItem: async (key) => null,
  setItem: async (key, value) => {},
  removeItem: async (key) => {}
};

export const mockTrails = [
  {
    id: '1',
    name: 'Preikestolen',
    difficulty: 'Hard',
    distance: '8 km',
    description: 'Spektakulær utsikt over Lysefjorden',
    location: { latitude: 58.9864, longitude: 6.1882 }
  },
  {
    id: '2', 
    name: 'Trolltunga',
    difficulty: 'Expert',
    distance: '28 km',
    description: 'Norges mest kjente fotospot',
    location: { latitude: 60.1242, longitude: 6.7402 }
  }
];

export const mockMemories = [
  {
    id: '1',
    title: 'Solnedgang på Preikestolen',
    description: 'En magisk kveld med utsikt over fjorden',
    date: new Date().toISOString(),
    location: 'Preikestolen, Norge',
    image: 'https://picsum.photos/300/200?random=1'
  }
];
`;
}

function createSnackAppJs() {
  return `// EchoTrail - Full App Export for Snack
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Mock data og services
const mockUser = { email: 'demo@snack.dev', role: 'user' };
const mockTrails = [
  {
    id: '1',
    name: 'Preikestolen',
    difficulty: 'Hard',
    distance: '8 km',
    description: 'Spektakulær utsikt over Lysefjorden'
  },
  {
    id: '2',
    name: 'Trolltunga', 
    difficulty: 'Expert',
    distance: '28 km',
    description: 'Norges mest kjente fotospot'
  }
];

const mockMemories = [
  {
    id: '1',
    title: 'Solnedgang på Preikestolen',
    description: 'En magisk kveld',
    date: '2024-08-15'
  }
];

// Hovedkomponent
export default function EchoTrailApp() {
  const [activeTab, setActiveTab] = useState('discover');
  const [user, setUser] = useState(mockUser);

  const tabs = [
    { id: 'discover', title: 'Oppdag', icon: 'explore' },
    { id: 'memories', title: 'Minner', icon: 'photo-library' },
    { id: 'maps', title: 'Kart', icon: 'map' },
    { id: 'settings', title: 'Instillinger', icon: 'settings' }
  ];

  const renderDiscoverScreen = () => (
    <ScrollView style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Velkommen til EchoTrail! 🥾</Text>
        <Text style={styles.subText}>Oppdag fantastiske turer med AI-guidet historiefortelling</Text>
      </View>

      <Text style={styles.sectionTitle}>🏔️ Anbefalte Turer</Text>
      {mockTrails.map(trail => (
        <TouchableOpacity 
          key={trail.id} 
          style={styles.trailCard}
          onPress={() => Alert.alert(trail.name, trail.description)}
        >
          <View style={styles.trailHeader}>
            <Text style={styles.trailName}>{trail.name}</Text>
            <Text style={styles.trailDifficulty}>{trail.difficulty}</Text>
          </View>
          <Text style={styles.trailDistance}>{trail.distance}</Text>
          <Text style={styles.trailDescription}>{trail.description}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderMemoriesScreen = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>📸 Mine Minner</Text>
      {mockMemories.map(memory => (
        <TouchableOpacity 
          key={memory.id} 
          style={styles.memoryCard}
          onPress={() => Alert.alert(memory.title, memory.description)}
        >
          <Text style={styles.memoryTitle}>{memory.title}</Text>
          <Text style={styles.memoryDescription}>{memory.description}</Text>
          <Text style={styles.memoryDate}>{memory.date}</Text>
        </TouchableOpacity>
      ))}
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => Alert.alert('Demo', 'I full-appen kan du legge til nye minner her!')}
      >
        <MaterialIcons name="add" size={24} color="white" />
        <Text style={styles.addButtonText}>Legg til minne</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderMapScreen = () => (
    <View style={styles.content}>
      <View style={styles.mapPlaceholder}>
        <MaterialIcons name="map" size={64} color="#2563eb" />
        <Text style={styles.mapText}>🗺️ Interaktivt Kart</Text>
        <Text style={styles.mapSubText}>I full-appen vil dette vise et interaktivt kart med alle turer og din posisjon</Text>
        
        <TouchableOpacity 
          style={styles.mapButton}
          onPress={() => Alert.alert('Kart', 'Full kart-funksjonalitet tilgjengelig i native app')}
        >
          <Text style={styles.mapButtonText}>Åpne Fullskjerm Kart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSettingsScreen = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>⚙️ Innstillinger</Text>
      
      <View style={styles.settingSection}>
        <Text style={styles.settingTitle}>Bruker</Text>
        <Text style={styles.settingValue}>{user.email}</Text>
        <Text style={styles.settingValue}>Rolle: {user.role}</Text>
      </View>

      <TouchableOpacity 
        style={styles.settingButton}
        onPress={() => Alert.alert('Språk', 'Bytt mellom Norsk og Engelsk')}
      >
        <MaterialIcons name="language" size={24} color="#2563eb" />
        <Text style={styles.settingButtonText}>Språk (Norsk/English)</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.settingButton}
        onPress={() => Alert.alert('Lyd', 'AI stemme-innstillinger')}
      >
        <MaterialIcons name="volume-up" size={24} color="#2563eb" />
        <Text style={styles.settingButtonText}>AI Stemme</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.settingButton}
        onPress={() => Alert.alert('Om', 'EchoTrail versjon 1.0\\nLaget med React Native og Expo')}
      >
        <MaterialIcons name="info" size={24} color="#2563eb" />
        <Text style={styles.settingButtonText}>Om Appen</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderCurrentScreen = () => {
    switch(activeTab) {
      case 'discover': return renderDiscoverScreen();
      case 'memories': return renderMemoriesScreen();
      case 'maps': return renderMapScreen();
      case 'settings': return renderSettingsScreen();
      default: return renderDiscoverScreen();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* App Header */}
      <View style={styles.appHeader}>
        <Text style={styles.appTitle}>EchoTrail</Text>
        <Text style={styles.appSubtitle}>🍿 Snack Demo</Text>
      </View>

      {/* Content */}
      {renderCurrentScreen()}

      {/* Bottom Navigation */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <MaterialIcons 
              name={tab.icon}
              size={24}
              color={activeTab === tab.id ? '#2563eb' : '#6b7280'}
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.activeTabText
            ]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  appHeader: {
    backgroundColor: '#2563eb',
    padding: 16,
    alignItems: 'center',
  },
  appTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  appSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  trailCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trailName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  trailDifficulty: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  trailDistance: {
    fontSize: 14,
    color: '#2563eb',
    marginBottom: 4,
  },
  trailDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  memoryCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  memoryDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  memoryDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  addButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    padding: 32,
  },
  mapText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  mapSubText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  mapButton: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
  },
  mapButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  settingSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  settingValue: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  settingButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingButtonText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    // Active tab styling handled by text/icon colors
  },
  tabText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
  },
});
`;
}

function createSnackPackageJson() {
  return JSON.stringify({
    "name": "echotrail-snack-demo",
    "version": "1.0.0",
    "description": "EchoTrail - Full App Demo for Expo Snack",
    "main": "App.js",
    "dependencies": SNACK_COMPATIBLE_DEPS,
    "devDependencies": {},
    "scripts": {
      "start": "expo start"
    },
    "keywords": ["expo", "react-native", "hiking", "trails", "ai", "snack"],
    "author": "EchoTrail Team",
    "license": "MIT"
  }, null, 2);
}

function copyAndTransformFiles(srcDir, destDir, basePath = '') {
  if (!fs.existsSync(srcDir)) {
    console.log(`⚠️  Directory not found: ${srcDir}`);
    return;
  }

  const items = fs.readdirSync(srcDir);
  
  items.forEach(item => {
    const srcPath = path.join(srcDir, item);
    const destPath = path.join(destDir, item);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      // Skip certain directories
      if (['node_modules', '.expo', '.git', 'android', 'ios'].includes(item)) {
        return;
      }
      
      fs.mkdirSync(destPath, { recursive: true });
      copyAndTransformFiles(srcPath, destPath, path.join(basePath, item));
    } else if (stat.isFile()) {
      // Only process specific file types
      if (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.js')) {
        try {
          let content = fs.readFileSync(srcPath, 'utf8');
          content = transformImports(content);
          fs.writeFileSync(destPath, content);
          console.log(`✅ Transformed: ${path.join(basePath, item)}`);
        } catch (error) {
          console.log(`⚠️  Could not transform: ${item} - ${error.message}`);
        }
      }
    }
  });
}

function exportFullApp() {
  console.log('🍿 Eksporterer EchoTrail til Snack...\n');

  // Clean and create export directory
  cleanDirectory(EXPORT_DIR);

  // Create main App.js file
  console.log('📱 Oppretter App.js...');
  fs.writeFileSync(path.join(EXPORT_DIR, 'App.js'), createSnackAppJs());

  // Create package.json for Snack
  console.log('📦 Oppretter package.json...');
  fs.writeFileSync(path.join(EXPORT_DIR, 'package.json'), createSnackPackageJson());

  // Create mock services file
  console.log('🔧 Oppretter mock services...');
  fs.writeFileSync(path.join(EXPORT_DIR, 'MockServices.js'), createMockServices());

  // Create README for Snack
  const snackReadme = `# EchoTrail - Snack Demo

Dette er en komplett demo av EchoTrail-appen optimalisert for Expo Snack.

## Funksjonalitet

✅ **4-tabs navigasjon**: Oppdag, Minner, Kart, Innstillinger
✅ **Mock data**: Sample trails og memories
✅ **Interaktiv UI**: Trykkbare kort og knapper  
✅ **Responsive design**: Fungerer på alle skjermstørrelser

## Testing

1. Scan QR-koden med Expo Go-appen
2. Test alle 4 tabs i bunnen
3. Trykk på trail-kort for detaljer
4. Test innstillinger og om-seksjonen

## Begrensninger i Snack

- Ingen ekte GPS/location services
- Mock data istedenfor ekte database
- Begrenset navigasjon (single screen app)
- Ingen native dependencies

For full funksjonalitet, last ned og kjør prosjektet lokalt.

---

🚀 Laget med React Native og Expo
`;

  fs.writeFileSync(path.join(EXPORT_DIR, 'README.md'), snackReadme);

  console.log(`\n✅ EchoTrail exportert til: ${EXPORT_DIR}`);
  console.log(`\n📋 Neste steg:`);
  console.log(`1. Gå til https://snack.expo.dev`);
  console.log(`2. Klikk "Import from files"`);
  console.log(`3. Last opp App.js og package.json`);
  console.log(`4. Test i Expo Go-appen!`);
  console.log(`\nEller bruk: npm run snack:create-zip for å lage zip-fil\n`);
}

function createZipForUpload() {
  console.log('📦 Lager zip-fil for Snack upload...');
  
  try {
    // Bruk PowerShell på Windows for å lage zip
    const zipPath = path.join(PROJECT_ROOT, 'echotrail-snack.zip');
    const powershellCommand = `Compress-Archive -Path "${EXPORT_DIR}\\*" -DestinationPath "${zipPath}" -Force`;
    
    execSync(powershellCommand, { shell: 'powershell' });
    
    console.log(`✅ Zip-fil opprettet: ${zipPath}`);
    console.log(`\n📋 For å laste opp:`);
    console.log(`1. Gå til https://snack.expo.dev`);
    console.log(`2. Klikk "Import from files"`);
    console.log(`3. Last opp: ${zipPath}`);
    console.log(`4. Test i Expo Go!`);
  } catch (error) {
    console.error(`❌ Kunne ikke lage zip-fil: ${error.message}`);
    console.log(`\n💡 Du kan manuelt komprimere mappen: ${EXPORT_DIR}`);
  }
}

function openSnack() {
  console.log('🍿 Åpner Expo Snack...');
  
  try {
    execSync('start https://snack.expo.dev', { shell: true });
    console.log('✅ Expo Snack åpnet i nettleser!');
    console.log(`\n💡 Last opp filene fra: ${EXPORT_DIR}`);
  } catch (error) {
    console.error('❌ Kunne ikke åpne nettleser automatisk');
    console.log('🔗 Gå manuelt til: https://snack.expo.dev');
  }
}

// Main function
function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'export':
      exportFullApp();
      break;
    case 'create-zip':
      if (!fs.existsSync(EXPORT_DIR)) {
        console.log('⚠️  Eksporter først: npm run snack:export');
        return;
      }
      createZipForUpload();
      break;
    case 'open-snack':
    case 'open':
      openSnack();
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
  exportFullApp,
  createZipForUpload,
  openSnack
};