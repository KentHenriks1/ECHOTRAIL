#!/usr/bin/env node
/**
 * Configuration Verification Script
 * Verifies that all required API keys and services are properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 EchoTrail Configuration Verification');
console.log('=======================================');
console.log('');

// Read .env file
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse environment variables
const env = {};
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
});

// Configuration checks
const checks = [
  {
    name: 'OpenAI API Key',
    key: 'EXPO_PUBLIC_OPENAI_API_KEY',
    required: true,
    validator: (value) => value && value.startsWith('sk-'),
    description: 'Required for AI story generation and TTS'
  },
  {
    name: 'Google Maps API Key',
    key: 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', 
    required: true,
    validator: (value) => value && value.startsWith('AIza'),
    description: 'Required for map functionality'
  },
  {
    name: 'Mapbox Access Token',
    key: 'EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN',
    required: true,
    validator: (value) => value && value.startsWith('sk.'),
    description: 'Required for advanced map features'
  },
  {
    name: 'Neon Database URL',
    key: 'DATABASE_URL',
    required: true,
    validator: (value) => value && value.includes('postgresql://'),
    description: 'Required for data storage'
  },
  {
    name: 'Neon API Endpoint',
    key: 'EXPO_PUBLIC_NEON_REST_API_URL',
    required: true,
    validator: (value) => value && value.startsWith('https://'),
    description: 'Required for REST API access'
  },
  {
    name: 'Stack Auth Project ID',
    key: 'EXPO_PUBLIC_STACK_AUTH_PROJECT_ID',
    required: true,
    validator: (value) => value && value.length > 10,
    description: 'Required for user authentication'
  },
  {
    name: 'Microsoft Client ID',
    key: 'EXPO_PUBLIC_MICROSOFT_CLIENT_ID',
    required: false,
    validator: (value) => !value || value.match(/[a-f0-9-]+/),
    description: 'Required for Microsoft authentication'
  },
  {
    name: 'Google Project ID',
    key: 'EXPO_PUBLIC_GOOGLE_PROJECT_ID',
    required: false,
    validator: (value) => !value || value.match(/[a-z0-9-]+/),
    description: 'Google Cloud project configuration'
  },
];

console.log('Configuration Status:');
console.log('');

let allRequiredConfigured = true;
let configurationsFound = 0;

checks.forEach(check => {
  const value = env[check.key];
  const isConfigured = value && value.length > 0;
  const isValid = !isConfigured || check.validator(value);
  
  if (isConfigured) configurationsFound++;
  
  let status;
  if (!isConfigured) {
    status = check.required ? '❌ Missing (Required)' : '⚠️ Not configured (Optional)';
    if (check.required) allRequiredConfigured = false;
  } else if (!isValid) {
    status = '⚠️ Invalid format';
    if (check.required) allRequiredConfigured = false;
  } else {
    status = '✅ Configured';
  }
  
  console.log(`   ${check.name}: ${status}`);
  console.log(`      Key: ${check.key}`);
  console.log(`      Description: ${check.description}`);
  if (isConfigured && check.key === 'EXPO_PUBLIC_OPENAI_API_KEY') {
    console.log(`      Value: ${value.substring(0, 12)}...${value.substring(value.length - 6)}`);
  } else if (isConfigured && value.length > 20) {
    console.log(`      Value: ${value.substring(0, 15)}...`);
  }
  console.log('');
});

// Service Status Summary
console.log('🚀 Service Status Summary:');
console.log('');

const serviceStatus = {
  'AI Story Generation': env['EXPO_PUBLIC_OPENAI_API_KEY'] ? '✅ Ready' : '❌ Missing OpenAI API Key',
  'Text-to-Speech': env['EXPO_PUBLIC_OPENAI_API_KEY'] ? '✅ Ready' : '❌ Missing OpenAI API Key',
  'Map Services': (env['EXPO_PUBLIC_GOOGLE_MAPS_API_KEY'] && env['EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN']) ? '✅ Ready' : '⚠️ Partially configured',
  'Database': env['DATABASE_URL'] ? '✅ Ready' : '❌ Missing database connection',
  'Authentication': env['EXPO_PUBLIC_STACK_AUTH_PROJECT_ID'] ? '✅ Ready' : '❌ Missing auth configuration',
  'Microsoft Login': env['EXPO_PUBLIC_MICROSOFT_CLIENT_ID'] ? '✅ Ready' : '⚠️ Not configured',
};

Object.entries(serviceStatus).forEach(([service, status]) => {
  console.log(`   ${service}: ${status}`);
});

console.log('');

// Final Status
console.log('📊 Configuration Summary:');
console.log(`   Total configurations found: ${configurationsFound}/${checks.length}`);
console.log(`   Required configurations: ${allRequiredConfigured ? '✅ Complete' : '❌ Missing required items'}`);
console.log('');

if (allRequiredConfigured) {
  console.log('🎉 Ready for Development!');
  console.log('   Your EchoTrail app is fully configured and ready to run.');
  console.log('   You can now:');
  console.log('   • Start the development server: npm start');
  console.log('   • Test AI features using the AI Test screen');
  console.log('   • Begin trail recording and story generation');
} else {
  console.log('⚠️ Configuration Incomplete');
  console.log('   Please configure the missing required items above before starting development.');
}

console.log('');
console.log('📚 Documentation: docs/AI_TTS_INTEGRATION.md');
console.log('🧪 Testing: Navigate to AI Test tab in the app');
console.log('🔧 Support: Check the troubleshooting section in the documentation');
console.log('');