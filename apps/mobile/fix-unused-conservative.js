#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const changes = [];

function processDirectory(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      if (item.name !== 'node_modules' && item.name !== '.expo' && 
          item.name !== 'android' && item.name !== 'ios' && 
          item.name !== '__tests__') {
        processDirectory(fullPath);
      }
    } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let fileChanges = [];
    
    // Find obvious unused imports
    const unusedImports = findUnusedImports(content);
    
    for (const unusedImport of unusedImports) {
      newContent = removeImportFromLine(newContent, unusedImport);
      fileChanges.push(`Removed unused import: ${unusedImport}`);
    }
    
    // Find unused function parameters that can be prefixed with underscore
    newContent = prefixUnusedParameters(newContent, fileChanges);
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      changes.push({
        file: filePath,
        changes: fileChanges
      });
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
      fileChanges.forEach(change => console.log(`   ${change}`));
    }
    
  } catch (error) {
    console.log(`❌ Error processing ${filePath}:`, error.message);
  }
}

function findUnusedImports(content) {
  const unusedImports = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (line.trim().startsWith('import ') && line.includes('{')) {
      // Extract named imports
      const match = line.match(/\{\s*([^}]+)\s*\}/);
      if (match) {
        const namedImports = match[1].split(',').map(name => {
          const parts = name.trim().split(' as ');
          return parts[parts.length - 1].trim();
        });
        
        for (const importName of namedImports) {
          // Very conservative check - only remove if clearly not used
          if (isObviouslyUnused(importName, content)) {
            unusedImports.push(importName);
          }
        }
      }
    }
  }
  
  return unusedImports;
}

function isObviouslyUnused(importName, content) {
  // Very conservative - only mark as unused if we're very sure
  const usagePatterns = [
    new RegExp(`\\b${importName}\\s*\\(`),        // Function call
    new RegExp(`\\b${importName}\\.`),            // Property access
    new RegExp(`<${importName}\\b`),              // JSX component
    new RegExp(`\\b${importName}\\s*=`),          // Assignment
    new RegExp(`\\{\\s*${importName}\\s*[,}]`),   // Destructuring
    new RegExp(`\\[${importName}\\]`),            // Array access
  ];
  
  // Count lines that contain import statement
  const importLines = content.split('\n').filter(line => 
    line.includes('import') && line.includes(importName)
  ).length;
  
  // Count other occurrences
  let usageCount = 0;
  for (const pattern of usagePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      usageCount += matches.length;
    }
  }
  
  // If we only see it in import statements, it's likely unused
  return usageCount === 0;
}

function removeImportFromLine(content, importName) {
  const lines = content.split('\n');
  const newLines = [];
  
  for (const line of lines) {
    if (line.trim().startsWith('import ') && line.includes(importName)) {
      // Remove this specific import from the line
      let newLine = line;
      
      // Handle different patterns
      if (line.includes('{')) {
        // Named imports
        newLine = newLine.replace(new RegExp(`\\b${importName}\\b,?\\s*`), '');
        newLine = newLine.replace(/,\s*}/, ' }');
        
        // If no imports left, remove entire line
        if (newLine.match(/\{\s*\}/)) {
          continue; // Skip this line
        }
        
        // Clean up any double commas
        newLine = newLine.replace(/,\s*,/, ',');
      }
      
      newLines.push(newLine);
    } else {
      newLines.push(line);
    }
  }
  
  return newLines.join('\n');
}

function prefixUnusedParameters(content, fileChanges) {
  let newContent = content;
  
  // Find function parameters that are unused
  const functionRegex = /(\w+)\s*:\s*\w+(?:\[\])?(?:\s*\|\s*\w+(?:\[\])?)*\s*(?=\)|,)/g;
  
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    const paramName = match[1];
    
    // Skip if already prefixed with underscore
    if (paramName.startsWith('_')) continue;
    
    // Check if parameter is used in the function
    const functionStart = content.lastIndexOf('function', match.index) !== -1 
      ? content.lastIndexOf('function', match.index)
      : content.lastIndexOf('=>', match.index);
    
    if (functionStart !== -1) {
      const nextFunctionStart = content.indexOf('function', match.index + 1);
      const functionEnd = nextFunctionStart !== -1 ? nextFunctionStart : content.length;
      const functionBody = content.slice(functionStart, functionEnd);
      
      // Simple check if parameter is used
      const paramUsageRegex = new RegExp(`\\b${paramName}\\b`);
      const usageCount = (functionBody.match(paramUsageRegex) || []).length;
      
      // If only seen once (in parameter declaration), it's unused
      if (usageCount === 1) {
        newContent = newContent.replace(
          new RegExp(`\\b${paramName}\\b(?=\\s*:)`), 
          `_${paramName}`
        );
        fileChanges.push(`Prefixed unused parameter: ${paramName} -> _${paramName}`);
      }
    }
  }
  
  return newContent;
}

console.log('🔍 Conservatively fixing unused imports and parameters...');
processDirectory('src');

if (changes.length === 0) {
  console.log('✨ No obvious unused imports or parameters found!');
} else {
  console.log(`\n📊 Summary: Fixed ${changes.length} files`);
  changes.forEach(change => {
    console.log(`📁 ${path.relative(process.cwd(), change.file)}: ${change.changes.length} fixes`);
  });
}
console.log('🎉 Conservative cleanup completed!');