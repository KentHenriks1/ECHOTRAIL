#!/usr/bin/env node

/**
 * EchoTrail Professional Snack SDK CLI
 * Bruker den offisielle Expo Snack SDK for programmatisk upload
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EXPORT_DIR = path.join(__dirname, '..', 'snack-export');
const PROJECT_ROOT = path.join(__dirname, '..');

function showHelp() {
  console.log(`
🚀 EchoTrail Professional Snack SDK CLI

Bruker offisiell Expo Snack SDK for programmatisk upload:

Kommandoer:
  install-sdk     - Installer Snack SDK
  create-snack    - Opprett Snack via SDK programmatisk  
  upload-direct   - Direkte upload med SDK
  generate-url    - Generer delbar Snack-URL
  help            - Vis denne hjelpeteksten

Eksempler:
  npm run snack:sdk-install
  npm run snack:sdk-create
  npm run snack:sdk-upload

🎯 Basert på: https://github.com/expo/snack/tree/main/packages/snack-sdk
`);
}

async function installSnackSDK() {
  console.log('📦 Installerer Expo Snack SDK...\n');
  
  try {
    console.log('🔍 Sjekker om snack-sdk allerede er installert...');
    
    // Sjekk om den allerede er installert
    try {
      execSync('npm list snack-sdk', { stdio: 'pipe' });
      console.log('✅ snack-sdk er allerede installert!\n');
    } catch (error) {
      console.log('📥 Installerer snack-sdk...');
      execSync('npm install snack-sdk', { stdio: 'inherit' });
      console.log('✅ snack-sdk installert!\n');
    }
    
    // Installer andre nødvendige dependencies
    console.log('📥 Installerer støtte-pakker...');
    const additionalDeps = [
      'nanoid',
      'fetch-ponyfill'
    ];
    
    for (const dep of additionalDeps) {
      try {
        execSync(`npm list ${dep}`, { stdio: 'pipe' });
        console.log(`✅ ${dep} allerede installert`);
      } catch (error) {
        console.log(`📥 Installerer ${dep}...`);
        execSync(`npm install ${dep}`, { stdio: 'inherit' });
      }
    }
    
    console.log('\n🎉 Snack SDK setup komplett!');
    console.log('💡 Du kan nå bruke: npm run snack:sdk-create\n');
    
  } catch (error) {
    console.error('❌ Installasjon feilet:', error.message);
    console.log('\n💡 Prøv manuell installasjon:');
    console.log('npm install snack-sdk nanoid fetch-ponyfill\n');
  }
}

async function createSnackViSDK() {
  console.log('🛠️  Oppretter Snack via SDK...\n');
  
  // Sjekk om export-filer finnes
  if (!fs.existsSync(EXPORT_DIR)) {
    console.error('❌ Export-mappe ikke funnet!');
    console.log('💡 Kjør først: npm run snack:export\n');
    return;
  }
  
  try {
    // Opprett en midlertidig script for SDK-bruk
    const sdkScript = `
const { SnackSession } = require('snack-sdk');
const fs = require('fs');
const path = require('path');

async function createEchoTrailSnack() {
  console.log('🔗 Kobler til Snack API...');
  
  try {
    // Les App.js
    const appPath = '${EXPORT_DIR.replace(/\\/g, '/')}/App.js';
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    // Les package.json  
    const packagePath = '${EXPORT_DIR.replace(/\\/g, '/')}/package.json';
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const packageData = JSON.parse(packageContent);
    
    console.log('📱 Setter opp Snack-sesjon...');
    
    // Opprett Snack-sesjon
    const session = new SnackSession({
      name: 'EchoTrail Demo',
      description: '🥾 AI-powered hiking app med 4-tab navigasjon, trails og memories',
      dependencies: packageData.dependencies || {},
      files: {
        'App.js': {
          type: 'CODE',
          contents: appContent
        },
        'package.json': {
          type: 'CODE', 
          contents: packageContent
        }
      }
    });
    
    console.log('🚀 Sender til Snack...');
    
    // Vent på sesjon-opprettelse
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout ved oppretting av Snack'));
      }, 30000);
      
      session.on('stateChanged', (state) => {
        console.log(\`📊 Status: \${state.state}\`);
        
        if (state.state === 'ready') {
          clearTimeout(timeout);
          resolve();
        }
        
        if (state.state === 'error') {
          clearTimeout(timeout); 
          reject(new Error('Snack-sesjon feilet'));
        }
      });
    });
    
    // Få URL
    const url = session.getUrl();
    console.log(\`\\n🎉 Snack opprettet!\\n\`);
    console.log(\`🔗 URL: \${url}\\n\`);
    console.log('📋 Instruksjoner:');
    console.log('1. Åpne URL-en i nettleser');
    console.log('2. Scan QR-koden med Expo Go');
    console.log('3. Test EchoTrail på telefonen!\\n');
    
    // Åpne automatisk
    const { execSync } = require('child_process');
    try {
      execSync(\`start "\${url}"\`, { shell: true });
      console.log('🌐 Snack åpnet automatisk i nettleser!');
    } catch (error) {
      console.log('💡 Åpne manuelt:', url);
    }
    
  } catch (error) {
    console.error('❌ SDK-feil:', error.message);
    console.log('\\n💡 Feilsøking:');
    console.log('- Sjekk internett-forbindelse');
    console.log('- Prøv igjen om litt');
    console.log('- Bruk fallback: npm run snack:auto-copy');
  }
}

createEchoTrailSnack().catch(console.error);
`;
    
    // Lagre og kjør SDK-script
    const tempScript = path.join(__dirname, 'temp-sdk-script.js');
    fs.writeFileSync(tempScript, sdkScript);
    
    console.log('🏃‍♂️ Kjører SDK-script...\n');
    execSync(`node "${tempScript}"`, { stdio: 'inherit' });
    
    // Cleanup
    fs.unlinkSync(tempScript);
    
  } catch (error) {
    console.error('❌ SDK-oppretting feilet:', error.message);
    console.log('\n🔄 Fallback til clipboard-metode...');
    
    // Fallback til vår auto-copy metode
    const { copyToClipboard } = require('./snack-cli-advanced.js');
    await copyToClipboard();
  }
}

async function uploadDirectViaSDK() {
  console.log('📤 Direkte upload via Snack SDK...\n');
  
  try {
    // Sjekk om SDK er tilgjengelig
    require.resolve('snack-sdk');
    console.log('✅ Snack SDK funnet');
    
    await createSnackViSDK();
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Snack SDK ikke installert!');
      console.log('💡 Installer først: npm run snack:sdk-install\n');
    } else {
      console.error('❌ Upload feilet:', error.message);
    }
  }
}

async function generateSnackURL() {
  console.log('🔗 Genererer Snack-URL...\n');
  
  // Dette vil bruke SDK til å generere en URL uten å åpne
  console.log('🧠 URL-genereringsstrategier:');
  console.log('1. 📡 SDK-basert URL-generering');
  console.log('2. 🔗 Direct API-kall');
  console.log('3. 📋 Template-basert URL\n');
  
  try {
    // For nå: Bruk vår beste metode
    console.log('🎯 Bruker beste tilgjengelige metode...');
    await createSnackViSDK();
    
  } catch (error) {
    console.log('⚠️  SDK-metode ikke tilgjengelig');
    console.log('🔄 Bruker fallback-URL-generering...');
    
    // Fallback: Generer en instruksjon-URL
    const instructionUrl = 'https://snack.expo.dev/?name=EchoTrail%20Demo&description=AI-powered%20hiking%20app';
    console.log(`🔗 Template-URL: ${instructionUrl}`);
    console.log('💡 Lim inn EchoTrail-koden manuelt');
  }
}

// Main function
function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'install-sdk':
    case 'install':
      installSnackSDK();
      break;
    case 'create-snack':
    case 'create':
      createSnackViSDK();
      break;
    case 'upload-direct':
    case 'upload':
      uploadDirectViaSDK();
      break;
    case 'generate-url':
    case 'url':
      generateSnackURL();
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
  installSnackSDK,
  createSnackViSDK,
  uploadDirectViaSDK,
  generateSnackURL
};