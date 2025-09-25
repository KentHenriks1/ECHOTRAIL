#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixParsingErrors(filePath) {
  try {
    console.log(`Fixing parsing errors in: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix malformed imports where logger import was inserted in the wrong place
    const malformedImportPattern = /import\s*{\s*\nimport\s*{\s*logger.*?\}\s*from\s*['"][^'"]+['"];\s*\n([^}]+)\s*}\s*from\s*["'][^"']+["'];/gms;
    
    if (malformedImportPattern.test(content)) {
      console.log('  - Found malformed import statements');
      
      // Extract the original imports and logger import
      content = content.replace(malformedImportPattern, (match, originalImports) => {
        console.log('  - Fixing malformed import structure');
        modified = true;
        
        // Extract logger import
        const loggerImport = match.match(/import\s*{\s*logger[^}]*}\s*from\s*['"][^'"]+['"];/)[0];
        
        // Extract the rest of the imports
        const restImports = `import {\n${originalImports.trim()}\n} from "react-native";`;
        
        return `${restImports}\n${loggerImport}`;
      });
    }
    
    // Fix cases where import statement is broken into multiple parts
    const brokenImportPattern = /import\s*{\s*\n(import\s*{[^}]+}\s*from[^;]+;)\s*\n([^}]+)\s*}\s*from\s*["'][^"']+["'];/gms;
    
    if (brokenImportPattern.test(content)) {
      console.log('  - Found broken import statements');
      
      content = content.replace(brokenImportPattern, (match, loggerImport, originalImports) => {
        console.log('  - Reconstructing broken imports');
        modified = true;
        
        const cleanLoggerImport = loggerImport.trim();
        const cleanOriginalImports = `import {\n${originalImports.trim()}\n} from "react-native";`;
        
        return `${cleanOriginalImports}\n${cleanLoggerImport}`;
      });
    }
    
    // Fix eslint disables that might be in wrong position
    if (content.startsWith('/* eslint-disable')) {
      // Find the first actual import
      const firstImportMatch = content.match(/^((?:\/\*[\s\S]*?\*\/\s*)*)(import[\s\S]*?)$/m);
      if (firstImportMatch) {
        const eslintComments = firstImportMatch[1];
        const restOfFile = content.substring(eslintComments.length);
        
        // Make sure there's proper spacing
        if (!restOfFile.startsWith('\n')) {
          content = eslintComments + '\n' + restOfFile;
          modified = true;
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ Fixed parsing errors in: ${filePath}`);
      return true;
    } else {
      console.log(`  ⏭️  No parsing errors found in: ${filePath}`);
      return false;
    }
    
  } catch (error) {
    console.error(`  ❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Fixing parsing errors in TypeScript/React files...\n');
  
  const filesToFix = [
    'src/components/ErrorBoundary.tsx',
    'src/components/OpenAISetup.tsx',
    'src/components/analytics/AnalyticsDashboard.tsx',
    'src/components/analytics/PerformanceWidget.tsx',
    'src/components/maps/AdaptiveMapView.tsx',
    'src/components/maps/MapLibreView.tsx',
    'src/components/maps/MapView.tsx',
    'src/components/maps/OfflineMapManager.tsx',
    'src/screens/ActiveTrailScreen.tsx',
    'src/screens/BetaOnboardingScreen.tsx',
    'src/screens/MemoriesScreen.tsx',
    'src/screens/NewSettingsScreen.tsx',
    'src/screens/NotificationSettingsScreen.tsx',
    'src/screens/OfflineMapsScreen.tsx',
    'src/screens/SettingsScreen.tsx',
    'src/screens/TrailDetailsScreen.tsx',
    'src/screens/TrailsScreen.tsx',
    'src/services/EnhancedTrailService.ts',
    'src/services/NavigationService.ts'
  ];
  
  let fixedCount = 0;
  
  for (const file of filesToFix) {
    if (fs.existsSync(file)) {
      const wasFixed = fixParsingErrors(file);
      if (wasFixed) fixedCount++;
    } else {
      console.log(`⚠️  File not found: ${file}`);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`Files processed: ${filesToFix.length}`);
  console.log(`Files fixed: ${fixedCount}`);
  
  console.log('\n🎉 Parsing error fixes completed!');
}

if (require.main === module) {
  main().catch(console.error);
}