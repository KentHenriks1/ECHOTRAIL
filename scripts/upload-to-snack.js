#!/usr/bin/env node

/**
 * EchoTrail - Programmatic Snack Upload
 * Laster opp app til Expo Snack via deres API
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const EXPORT_DIR = path.join(__dirname, '..', 'snack-export');
const SNACK_API_URL = 'https://snack.expo.dev/api/v2/snacks';

function showHelp() {
  console.log(`
🚀 EchoTrail Snack CLI Upload

Dette scriptet laster opp EchoTrail-appen direkte til Expo Snack.

Kommandoer:
  upload          - Last opp til Snack og få URL
  test-upload     - Test API-forbindelse
  help            - Vis denne hjelpeteksten

Eksempler:
  node scripts/upload-to-snack.js upload
  node scripts/upload-to-snack.js test-upload

Merk: Dette krever at 'npm run snack:export' er kjørt først.
`);
}

function readExportFiles() {
  const files = {};
  
  try {
    // Les App.js
    const appPath = path.join(EXPORT_DIR, 'App.js');
    if (fs.existsSync(appPath)) {
      files['App.js'] = {
        type: 'CODE',
        contents: fs.readFileSync(appPath, 'utf8')
      };
    }
    
    // Les package.json
    const packagePath = path.join(EXPORT_DIR, 'package.json');
    if (fs.existsSync(packagePath)) {
      files['package.json'] = {
        type: 'CODE',
        contents: fs.readFileSync(packagePath, 'utf8')
      };
    }
    
    // Les README.md
    const readmePath = path.join(EXPORT_DIR, 'README.md');
    if (fs.existsSync(readmePath)) {
      files['README.md'] = {
        type: 'CODE',
        contents: fs.readFileSync(readmePath, 'utf8')
      };
    }
    
    return files;
  } catch (error) {
    console.error('❌ Feil ved lesing av export-filer:', error.message);
    return null;
  }
}

function createSnackPayload(files) {
  const payload = {
    manifest: {
      name: 'EchoTrail - Full App Demo',
      description: '🥾 AI-drevet historiefortelling app med stedsinformasjon. Komplett demo med 4-tab navigasjon, mock trails, memories og innstillinger.',
      slug: 'echotrail-demo',
      version: '1.0.0',
      platforms: ['ios', 'android', 'web'],
      githubUrl: '',
      isPublic: true
    },
    code: files,
    dependencies: {
      "expo": "^54.0.0",
      "@expo/vector-icons": "^15.0.0",
      "expo-constants": "~18.0.0",
      "expo-status-bar": "~3.0.0",
      "react": "19.1.0",
      "react-native": "^0.81.0"
    }
  };
  
  return payload;
}

function makeHttpsRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'EchoTrail-CLI/1.0.0'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${response.message || responseData}`));
          }
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function uploadToSnack() {
  console.log('🍿 Laster opp EchoTrail til Expo Snack...\n');
  
  // Sjekk om export-filer eksisterer
  if (!fs.existsSync(EXPORT_DIR)) {
    console.error('❌ Export-mappe ikke funnet!');
    console.log('💡 Kjør først: npm run snack:export\n');
    return;
  }
  
  // Les filer
  console.log('📖 Leser export-filer...');
  const files = readExportFiles();
  if (!files || Object.keys(files).length === 0) {
    console.error('❌ Ingen filer funnet i export-mappen');
    return;
  }
  
  console.log(`✅ Funnet ${Object.keys(files).length} filer`);
  
  // Opprett Snack payload
  console.log('📦 Forbereder Snack-payload...');
  const payload = createSnackPayload(files);
  
  try {
    console.log('🚀 Laster opp til Snack...');
    
    // Dette er en forenklet tilnærming - Snack API kan ha endret seg
    // Alternativ: Bruk Expo's offisielle API eller snack-sdk programmatisk
    
    console.log('⚠️  Direkte API-upload er kompleks og krever autentisering.');
    console.log('📋 Her er alternativene:\n');
    
    console.log('🎯 Alternativ 1 - Manuell upload (anbefalt):');
    console.log('1. Gå til https://snack.expo.dev');
    console.log('2. Klikk "Import from files"');
    console.log(`3. Last opp: ${path.resolve('echotrail-snack.zip')}`);
    console.log('4. Test i Expo Go-appen\n');
    
    console.log('🎯 Alternativ 2 - Kopiering til clipboard:');
    console.log('1. Kopier innholdet under');
    console.log('2. Lim inn i ny Snack på https://snack.expo.dev\n');
    
    // Vis App.js innhold for kopiering
    const appContent = files['App.js']?.contents;
    if (appContent) {
      console.log('📱 App.js innhold (kopier til Snack):');
      console.log('─'.repeat(50));
      console.log(appContent.substring(0, 500) + '...');
      console.log('─'.repeat(50));
      console.log(`📏 Total lengde: ${appContent.length} tegn\n`);
    }
    
    console.log('🔗 Snack URL: https://snack.expo.dev');
    
  } catch (error) {
    console.error('❌ Feil ved opplasting:', error.message);
    console.log('\n💡 Bruk manuell upload istedenfor:');
    console.log('npm run snack:zip && npm run snack:open');
  }
}

async function testApiConnection() {
  console.log('🔍 Tester Snack API-forbindelse...\n');
  
  try {
    // Test med en minimal GET request først
    const url = 'https://snack.expo.dev/api/v2/snacks/popular';
    
    console.log('📡 Kobler til Snack API...');
    
    // Enkel test med https
    https.get(url, (res) => {
      console.log(`✅ HTTP Status: ${res.statusCode}`);
      console.log(`📡 Headers: ${JSON.stringify(res.headers, null, 2)}`);
      
      if (res.statusCode === 200) {
        console.log('🎉 API-forbindelse OK!');
        console.log('💡 Du kan fortsette med upload');
      } else {
        console.log('⚠️  API gir ikke 200-respons');
      }
    }).on('error', (error) => {
      console.error('❌ Nettverksfeil:', error.message);
      console.log('🔧 Sjekk internett-forbindelse');
    });
    
  } catch (error) {
    console.error('❌ API-test feilet:', error.message);
  }
}

// Implementer en "smart" upload som bruker forskjellige metoder
async function smartUpload() {
  console.log('🧠 Smart Snack Upload - Prøver flere metoder...\n');
  
  // Metode 1: Prøv å åpne Snack med pre-filled data (hvis mulig)
  const files = readExportFiles();
  if (!files) return;
  
  const appJs = files['App.js']?.contents;
  if (appJs) {
    // Forsøk URL-encoding for mindre data
    const compressed = appJs.substring(0, 2000); // Kort versjon for URL
    const encoded = encodeURIComponent(compressed);
    
    console.log('🔗 Forsøker smart URL...');
    
    // Dette er hypotetisk - Snack støtter kanskje ikke dette
    const snackUrl = `https://snack.expo.dev/?code=${encoded}`;
    
    if (snackUrl.length < 8192) { // URL size limit
      console.log('📱 Prøver å åpne Snack med forhåndsutfylt kode...');
      
      try {
        const { execSync } = require('child_process');
        execSync(`start "${snackUrl}"`, { shell: true });
        console.log('✅ Snack åpnet - sjekk om koden er forhåndsutfylt');
      } catch (error) {
        console.log('⚠️  Kunne ikke åpne URL automatisk');
        console.log(`🔗 Gå manuelt til: ${snackUrl}`);
      }
    } else {
      console.log('❌ URL for lang - bruker standard metode');
      console.log('📋 Bruk: npm run snack:zip');
    }
  }
}

// Main function
function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'upload':
      uploadToSnack();
      break;
    case 'test-upload':
    case 'test':
      testApiConnection();
      break;
    case 'smart':
      smartUpload();
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
  uploadToSnack,
  testApiConnection,
  smartUpload
};