
const { SnackSession } = require('snack-sdk');
const fs = require('fs');
const path = require('path');

async function createEchoTrailSnack() {
  console.log('🔗 Kobler til Snack API...');
  
  try {
    // Les App.js
    const appPath = 'C:/Users/Kenth/Desktop/EchoTrail-Fresh-Build/snack-export/App.js';
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    // Les package.json  
    const packagePath = 'C:/Users/Kenth/Desktop/EchoTrail-Fresh-Build/snack-export/package.json';
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
        console.log(`📊 Status: ${state.state}`);
        
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
    console.log(`\n🎉 Snack opprettet!\n`);
    console.log(`🔗 URL: ${url}\n`);
    console.log('📋 Instruksjoner:');
    console.log('1. Åpne URL-en i nettleser');
    console.log('2. Scan QR-koden med Expo Go');
    console.log('3. Test EchoTrail på telefonen!\n');
    
    // Åpne automatisk
    const { execSync } = require('child_process');
    try {
      execSync(`start "${url}"`, { shell: true });
      console.log('🌐 Snack åpnet automatisk i nettleser!');
    } catch (error) {
      console.log('💡 Åpne manuelt:', url);
    }
    
  } catch (error) {
    console.error('❌ SDK-feil:', error.message);
    console.log('\n💡 Feilsøking:');
    console.log('- Sjekk internett-forbindelse');
    console.log('- Prøv igjen om litt');
    console.log('- Bruk fallback: npm run snack:auto-copy');
  }
}

createEchoTrailSnack().catch(console.error);
