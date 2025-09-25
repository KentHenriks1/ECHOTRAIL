// Metro workaround for createModuleIdFactory missing issue
// This creates a fallback when the module is not found

const path = require('path');
const fs = require('fs');

// Check if createModuleIdFactory exists
const metroPath = path.join(__dirname, '../../node_modules/metro/src/lib/createModuleIdFactory.js');
const altMetroPath = path.join(__dirname, '../../node_modules/metro/lib/createModuleIdFactory.js');

if (!fs.existsSync(metroPath) && !fs.existsSync(altMetroPath)) {
  console.log('🔧 Creating Metro createModuleIdFactory fallback...');
  
  // Create minimal fallback
  const fallbackDir = path.join(__dirname, '../../node_modules/metro/src/lib');
  const fallbackFile = path.join(fallbackDir, 'createModuleIdFactory.js');
  
  try {
    // Ensure directory exists
    fs.mkdirSync(fallbackDir, { recursive: true });
    
    // Create minimal implementation
    const fallbackContent = `
// Fallback implementation for missing createModuleIdFactory
module.exports = function createModuleIdFactory() {
  return function moduleIdFactory(path) {
    return path;
  };
};
`;
    
    fs.writeFileSync(fallbackFile, fallbackContent);
    console.log('✅ Metro fallback created successfully');
  } catch (error) {
    console.log('❌ Failed to create Metro fallback:', error.message);
  }
} else {
  console.log('✅ Metro createModuleIdFactory already exists');
}