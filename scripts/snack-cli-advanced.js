#!/usr/bin/env node

/**
 * EchoTrail Advanced Snack CLI
 * Avansert CLI som forsøker flere metoder for å få appen til Snack
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EXPORT_DIR = path.join(__dirname, '..', 'snack-export');

function showHelp() {
  console.log(`
🚀 EchoTrail Advanced Snack CLI

Forsøker flere metoder for å få appen til Snack via CLI:

Kommandoer:
  auto-copy       - Kopier App.js til clipboard automatisk
  qr-upload       - Generer lokalt som kan scannes til Snack  
  create-link     - Lag shareable link (hvis mulig)
  serve-local     - Serve som lokal Snack-kompatibel server
  help            - Vis denne hjelpeteksten

Eksempler:
  npm run snack:auto-copy
  npm run snack:qr-upload
  npm run snack:serve-local

🎯 Målet: Få EchoTrail til å kjøre i Snack uten manuell kopiering!
`);
}

async function copyToClipboard() {
  console.log('📋 Kopierer App.js til clipboard...\n');
  
  const appPath = path.join(EXPORT_DIR, 'App.js');
  
  if (!fs.existsSync(appPath)) {
    console.error('❌ App.js ikke funnet!');
    console.log('💡 Kjør først: npm run snack:export\n');
    return;
  }
  
  try {
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    // Bruk PowerShell til å kopiere til clipboard på Windows
    const tempFile = path.join(__dirname, 'temp-app.js');
    fs.writeFileSync(tempFile, appContent);
    
    const command = `Get-Content "${tempFile}" | Set-Clipboard`;
    execSync(command, { shell: 'powershell' });
    
    // Cleanup
    fs.unlinkSync(tempFile);
    
    console.log('✅ App.js kopiert til clipboard!');
    console.log(`📏 ${appContent.length} tegn kopiert\n`);
    
    console.log('📋 Neste steg:');
    console.log('1. Gå til https://snack.expo.dev');
    console.log('2. Erstatt default-koden med Ctrl+A, Ctrl+V');
    console.log('3. Test i Expo Go-appen!\n');
    
    // Åpne Snack automatisk
    execSync('start https://snack.expo.dev', { shell: true });
    console.log('🌐 Snack åpnet i nettleser!');
    
  } catch (error) {
    console.error('❌ Feil ved kopiering:', error.message);
    console.log('💡 Prøv manuell kopiering istedenfor');
  }
}

async function generateQRUpload() {
  console.log('📱 Genererer QR-upload til Snack...\n');
  
  const appPath = path.join(EXPORT_DIR, 'App.js');
  
  if (!fs.existsSync(appPath)) {
    console.error('❌ App.js ikke funnet!');
    return;
  }
  
  try {
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    // Generer en base64-encoded versjon for deling
    const encoded = Buffer.from(appContent).toString('base64');
    
    console.log('🔗 Generer delbar URL...');
    
    // Hypotetisk delbar URL (Snack støtter kanskje ikke dette)
    const shareableData = {
      name: 'EchoTrail Demo',
      code: appContent.substring(0, 1000), // Begrenset størrelse
      description: 'AI-powered hiking app'
    };
    
    console.log('📊 Data-statistikk:');
    console.log(`   📏 Total kode: ${appContent.length} tegn`);
    console.log(`   📦 Komprimert: ${encoded.length} tegn`);
    console.log(`   🔗 URL-safe: ${shareableData.code.length} tegn\n`);
    
    // Alternativ: Lag lokal HTML-fil som kan vises som QR
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>EchoTrail Snack QR Code</title>
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
</head>
<body style="text-align: center; font-family: Arial;">
    <h1>🍿 EchoTrail Snack Demo</h1>
    <div id="qrcode"></div>
    <p>Scan med telefon for direkte tilgang til Snack!</p>
    <script>
        const snackUrl = 'https://snack.expo.dev';
        QRCode.toCanvas(document.getElementById('qrcode'), snackUrl, function (error) {
            if (error) console.error(error)
            console.log('QR Code generated!')
        });
    </script>
</body>
</html>`;
    
    const htmlPath = path.join(__dirname, '..', 'snack-qr.html');
    fs.writeFileSync(htmlPath, htmlContent);
    
    console.log(`✅ QR-side lagret: ${htmlPath}`);
    console.log('🌐 Åpner QR-side...\n');
    
    execSync(`start "${htmlPath}"`, { shell: true });
    
    console.log('📋 Instruksjoner:');
    console.log('1. Scan QR-koden med telefonen');
    console.log('2. Lim inn EchoTrail-koden i Snack');
    console.log('3. Test i Expo Go!\n');
    
  } catch (error) {
    console.error('❌ QR-generering feilet:', error.message);
  }
}

async function createShareableLink() {
  console.log('🔗 Forsøker å lage delbar Snack-link...\n');
  
  // Snack har ikke offentlig API for å lage links programmatisk
  // Men vi kan forsøke alternative metoder
  
  console.log('🧠 Smart link-strategier:');
  console.log('1. 📋 Clipboard + Auto-åpne Snack');
  console.log('2. 🔗 GitHub Gist + Snack import');
  console.log('3. 📦 Pastebin + Snack template\n');
  
  // Metode 1: GitHub Gist
  try {
    console.log('🐙 Forsøker GitHub Gist...');
    
    const appContent = fs.readFileSync(path.join(EXPORT_DIR, 'App.js'), 'utf8');
    
    // Dette krever GitHub CLI eller API-token
    console.log('⚠️  GitHub Gist krever autentisering');
    console.log('💡 Alternativ: Bruk manuell gist på https://gist.github.com\n');
    
    // Metode 2: Pastebin-stil (hypotetisk)
    console.log('📋 Pastebin-strategi:');
    console.log('1. Last opp kode til pastebin-tjeneste');
    console.log('2. Bruk URL i Snack som import');
    console.log('3. Del URL med andre\n');
    
    // For nå: Guide brukeren til beste praksis
    console.log('🎯 Anbefalte tilnærming:');
    console.log('1. npm run snack:auto-copy  (kopier til clipboard)');
    console.log('2. Gå til https://snack.expo.dev');
    console.log('3. Lim inn koden');
    console.log('4. Klikk "Save" for å få delbar URL');
    console.log('5. Del URL-en med andre!\n');
    
  } catch (error) {
    console.error('❌ Link-generering feilet:', error.message);
  }
}

async function serveLocal() {
  console.log('🌐 Starter lokal Snack-kompatibel server...\n');
  
  const http = require('http');
  const port = 3001;
  
  const server = http.createServer((req, res) => {
    // CORS headers for Snack
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.end();
      return;
    }
    
    if (req.url === '/app.js') {
      try {
        const appContent = fs.readFileSync(path.join(EXPORT_DIR, 'App.js'), 'utf8');
        res.setHeader('Content-Type', 'application/javascript');
        res.end(appContent);
      } catch (error) {
        res.statusCode = 404;
        res.end('App.js not found');
      }
    } else if (req.url === '/package.json') {
      try {
        const packageContent = fs.readFileSync(path.join(EXPORT_DIR, 'package.json'), 'utf8');
        res.setHeader('Content-Type', 'application/json');
        res.end(packageContent);
      } catch (error) {
        res.statusCode = 404;
        res.end('package.json not found');
      }
    } else if (req.url === '/') {
      // Serve en HTML-side med Snack-instruksjoner
      const html = `
<!DOCTYPE html>
<html>
<head>
    <title>EchoTrail Local Snack Server</title>
</head>
<body style="font-family: Arial; max-width: 800px; margin: 0 auto; padding: 20px;">
    <h1>🍿 EchoTrail Snack Server</h1>
    <p>Serverer EchoTrail-appen lokalt for Snack-bruk.</p>
    
    <h2>📂 Tilgjengelige filer:</h2>
    <ul>
        <li><a href="/app.js">/app.js</a> - Hovedapp-fil</li>
        <li><a href="/package.json">/package.json</a> - Dependencies</li>
    </ul>
    
    <h2>🔗 For bruk i Snack:</h2>
    <ol>
        <li>Gå til <a href="https://snack.expo.dev" target="_blank">https://snack.expo.dev</a></li>
        <li>Kopier innholdet fra <a href="/app.js">/app.js</a></li>
        <li>Lim inn i Snack-editoren</li>
        <li>Test i Expo Go!</li>
    </ol>
    
    <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <strong>🌐 Server kjører på:</strong><br>
        <code>http://localhost:${port}</code><br><br>
        <strong>📱 For mobil testing:</strong><br>
        Finn din IP-adresse og bruk <code>http://YOUR_IP:${port}</code>
    </div>
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html');
      res.end(html);
    } else {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
  
  server.listen(port, () => {
    console.log(`✅ Server kjører på http://localhost:${port}`);
    console.log(`🌐 Åpner i nettleser...\n`);
    
    try {
      execSync(`start http://localhost:${port}`, { shell: true });
    } catch (error) {
      console.log(`🔗 Gå manuelt til: http://localhost:${port}`);
    }
    
    console.log('📋 Instruksjoner:');
    console.log('1. Klikk på /app.js linken');
    console.log('2. Kopier alt innhold');
    console.log('3. Gå til https://snack.expo.dev');
    console.log('4. Lim inn koden og test!\n');
    console.log('⏹️  Trykk Ctrl+C for å stoppe serveren');
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n⏹️  Stopper server...');
    server.close(() => {
      console.log('✅ Server stoppet');
      process.exit(0);
    });
  });
}

// Main function
function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'auto-copy':
    case 'copy':
      copyToClipboard();
      break;
    case 'qr-upload':
    case 'qr':
      generateQRUpload();
      break;
    case 'create-link':
    case 'link':
      createShareableLink();
      break;
    case 'serve-local':
    case 'serve':
      serveLocal();
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
  copyToClipboard,
  generateQRUpload,
  createShareableLink,
  serveLocal
};