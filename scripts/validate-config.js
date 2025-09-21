#!/usr/bin/env node

// 🔍 EchoTrail Configuration Validator
// Dette scriptet validerer at alle environments er korrekt konfigurert

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description}: ${filePath}`, 'green');
    return true;
  } else {
    log(`❌ ${description}: Missing ${filePath}`, 'red');
    return false;
  }
}

function validateEasConfig() {
  log('🔍 Validating EAS Configuration...', 'cyan');
  
  const easConfigPath = './eas.json';
  if (!fs.existsSync(easConfigPath)) {
    log('❌ eas.json not found!', 'red');
    return false;
  }

  try {
    const easConfig = JSON.parse(fs.readFileSync(easConfigPath, 'utf8'));
    
    const requiredEnvironments = ['development', 'preview', 'staging', 'beta', 'production'];
    let allValid = true;

    log('📋 Checking build profiles...', 'blue');
    
    for (const env of requiredEnvironments) {
      if (easConfig.build && easConfig.build[env]) {
        log(`  ✅ ${env} profile configured`, 'green');
        
        // Check environment variables
        if (easConfig.build[env].env) {
          const envVars = easConfig.build[env].env;
          log(`    📝 Environment variables: ${Object.keys(envVars).length}`, 'blue');
          
          // Validate critical env vars
          const criticalVars = ['ENVIRONMENT', 'EXPO_PUBLIC_API_BASE_URL'];
          for (const varName of criticalVars) {
            if (envVars[varName]) {
              log(`      ✅ ${varName}: ${envVars[varName]}`, 'green');
            } else {
              log(`      ❌ Missing critical variable: ${varName}`, 'red');
              allValid = false;
            }
          }
        } else {
          log(`    ⚠️  No environment variables defined for ${env}`, 'yellow');
        }
      } else {
        log(`  ❌ Missing ${env} profile`, 'red');
        allValid = false;
      }
    }

    return allValid;
  } catch (error) {
    log(`❌ Error parsing eas.json: ${error.message}`, 'red');
    return false;
  }
}

function validatePackageJson() {
  log('📦 Validating Package Configuration...', 'cyan');
  
  const packagePath = './package.json';
  if (!fs.existsSync(packagePath)) {
    log('❌ package.json not found!', 'red');
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Check EAS scripts
    const requiredScripts = [
      'eas:build',
      'eas:build:dev', 
      'eas:build:preview',
      'eas:build:staging',
      'eas:build:beta',
      'eas:build:prod',
      'guaranteed:build',
      'guaranteed:deploy'
    ];

    let allValid = true;
    
    log('🔧 Checking EAS scripts...', 'blue');
    for (const script of requiredScripts) {
      if (packageJson.scripts && packageJson.scripts[script]) {
        log(`  ✅ ${script}`, 'green');
      } else {
        log(`  ❌ Missing script: ${script}`, 'red');
        allValid = false;
      }
    }

    return allValid;
  } catch (error) {
    log(`❌ Error parsing package.json: ${error.message}`, 'red');
    return false;
  }
}

function validateEnvironmentFile() {
  log('🌍 Validating Environment Files...', 'cyan');
  
  let hasEnvFile = false;
  
  if (fs.existsSync('.env')) {
    log('✅ .env file found', 'green');
    hasEnvFile = true;
  } else if (fs.existsSync('.env.example')) {
    log('⚠️  Only .env.example found (create .env for local development)', 'yellow');
    hasEnvFile = true;
  } else {
    log('❌ No environment file found (.env or .env.example)', 'red');
    return false;
  }

  return hasEnvFile;
}

function validateAppConfig() {
  log('📱 Validating App Configuration...', 'cyan');
  
  const appConfigPath = './app.json';
  if (!fs.existsSync(appConfigPath)) {
    log('❌ app.json not found!', 'red');
    return false;
  }

  try {
    const appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
    
    if (appConfig.expo) {
      log(`✅ App Name: ${appConfig.expo.name || 'Not set'}`, 'green');
      log(`✅ App Slug: ${appConfig.expo.slug || 'Not set'}`, 'green');
      log(`✅ Version: ${appConfig.expo.version || 'Not set'}`, 'green');
      log(`✅ SDK Version: ${appConfig.expo.sdkVersion || 'Latest'}`, 'green');
      
      // Check platforms
      const platforms = appConfig.expo.platforms || ['ios', 'android'];
      log(`✅ Platforms: ${platforms.join(', ')}`, 'green');
      
      return true;
    } else {
      log('❌ Invalid app.json structure (missing expo config)', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error parsing app.json: ${error.message}`, 'red');
    return false;
  }
}

function validateBuildScripts() {
  log('📜 Validating Build Scripts...', 'cyan');
  
  const scriptsDir = './scripts';
  let allValid = true;

  const requiredScripts = [
    { file: 'build-deploy.ps1', desc: 'PowerShell build script' }
  ];

  if (!fs.existsSync(scriptsDir)) {
    log('❌ Scripts directory not found!', 'red');
    return false;
  }

  for (const script of requiredScripts) {
    const scriptPath = path.join(scriptsDir, script.file);
    if (!validateFile(scriptPath, script.desc)) {
      allValid = false;
    }
  }

  return allValid;
}

function generateSummary(results) {
  log('\n🎯 Configuration Validation Summary', 'cyan');
  log('=====================================', 'cyan');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    log(`${icon} ${result.name}`, color);
  }
  
  log(`\n📊 Score: ${passed}/${total}`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n🎉 All validations passed! Your EAS setup is ready to go!', 'green');
    log('🚀 You can now run: pnpm run guaranteed:build', 'green');
  } else {
    log('\n⚠️  Some validations failed. Please fix the issues above.', 'yellow');
    log('📋 Check README-EAS-BUILDS.md for setup instructions.', 'blue');
  }
  
  return passed === total;
}

// Main validation
function main() {
  log('🔍 EchoTrail Configuration Validator', 'cyan');
  log('====================================', 'cyan');
  
  const validations = [
    { name: 'EAS Configuration', test: validateEasConfig },
    { name: 'Package Scripts', test: validatePackageJson },
    { name: 'Environment Files', test: validateEnvironmentFile },
    { name: 'App Configuration', test: validateAppConfig },
    { name: 'Build Scripts', test: validateBuildScripts }
  ];

  const results = validations.map(validation => {
    log(`\n🔍 ${validation.name}...`, 'blue');
    const passed = validation.test();
    return { name: validation.name, passed };
  });

  const allPassed = generateSummary(results);
  
  process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { 
  validateEasConfig, 
  validatePackageJson, 
  validateEnvironmentFile,
  validateAppConfig,
  validateBuildScripts
};