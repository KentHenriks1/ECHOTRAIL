#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Track all changes made
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
    
    // Find import statements
    const importLines = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.trim().startsWith('import ')) {
        importLines.push({ line: line.trim(), index });
      }
    });
    
    // Process imports and find unused ones
    for (const importInfo of importLines) {
      const { line, index } = importInfo;
      
      // Extract imported names
      const importedNames = extractImportedNames(line);
      const unusedImports = [];
      
      for (const name of importedNames) {
        if (!isVariableUsed(name, content, index)) {
          unusedImports.push(name);
        }
      }
      
      if (unusedImports.length > 0) {
        const newImportLine = removeUnusedFromImport(line, unusedImports);
        if (newImportLine !== line) {
          newContent = newContent.replace(line, newImportLine);
          fileChanges.push(`Removed unused imports: ${unusedImports.join(', ')}`);
        }
      }
    }
    
    // Find unused variables (simple pattern matching)
    const variableDeclarations = findVariableDeclarations(newContent);
    
    for (const varDecl of variableDeclarations) {
      if (!isVariableUsed(varDecl.name, newContent, varDecl.lineIndex)) {
        // Prefix unused variables with underscore
        const oldDeclaration = varDecl.fullDeclaration;
        const newDeclaration = oldDeclaration.replace(
          new RegExp(`\\b${varDecl.name}\\b`), 
          `_${varDecl.name}`
        );
        newContent = newContent.replace(oldDeclaration, newDeclaration);
        fileChanges.push(`Prefixed unused variable: ${varDecl.name} -> _${varDecl.name}`);
      }
    }
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      changes.push({
        file: filePath,
        changes: fileChanges
      });
      console.log(`✅ Fixed: ${filePath}`);
      fileChanges.forEach(change => console.log(`   ${change}`));
    }
    
  } catch (error) {
    console.log(`❌ Error processing ${filePath}:`, error.message);
  }
}

function extractImportedNames(importLine) {
  const names = [];
  
  // Handle different import patterns
  if (importLine.includes('{')) {
    // Named imports: import { A, B, C } from 'module'
    const match = importLine.match(/\{\s*([^}]+)\s*\}/);
    if (match) {
      const namedImports = match[1].split(',').map(name => {
        // Handle 'as' aliases: A as B
        const parts = name.trim().split(' as ');
        return parts[parts.length - 1].trim();
      });
      names.push(...namedImports);
    }
  }
  
  // Default imports: import Something from 'module'
  const defaultMatch = importLine.match(/import\s+(\w+)\s+from/);
  if (defaultMatch && !importLine.includes('{')) {
    names.push(defaultMatch[1]);
  }
  
  // Namespace imports: import * as Something from 'module'
  const namespaceMatch = importLine.match(/import\s+\*\s+as\s+(\w+)\s+from/);
  if (namespaceMatch) {
    names.push(namespaceMatch[1]);
  }
  
  return names;
}

function isVariableUsed(variableName, content, declarationIndex) {
  const lines = content.split('\n');
  
  // Check if variable is used after its declaration
  for (let i = declarationIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Simple check for variable usage (could be improved)
    const regex = new RegExp(`\\b${variableName}\\b`);
    if (regex.test(line)) {
      return true;
    }
  }
  
  return false;
}

function removeUnusedFromImport(importLine, unusedNames) {
  if (!importLine.includes('{')) {
    // Default or namespace import - remove entire line if unused
    return unusedNames.length > 0 ? '' : importLine;
  }
  
  // Named imports
  let newImportLine = importLine;
  
  for (const unusedName of unusedNames) {
    // Remove the unused import from the destructuring
    newImportLine = newImportLine.replace(new RegExp(`\\b${unusedName}\\b,?\\s*`), '');
    newImportLine = newImportLine.replace(/,\s*}/, ' }');
  }
  
  // If no imports left, remove entire line
  if (newImportLine.match(/\{\s*\}/)) {
    return '';
  }
  
  return newImportLine;
}

function findVariableDeclarations(content) {
  const declarations = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Simple patterns for variable declarations
    const patterns = [
      /const\s+(\w+)\s*=/,
      /let\s+(\w+)\s*=/,
      /var\s+(\w+)\s*=/,
      /function\s+(\w+)\s*\(/,
      /(\w+)\s*:\s*\w+\s*=/, // object property with type
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const variableName = match[1];
        
        // Skip some patterns that are likely to be used
        if (!variableName.startsWith('_') && 
            variableName !== 'React' && 
            variableName !== 'exports' &&
            !variableName.startsWith('use') && // React hooks
            variableName.length > 1) {
          
          declarations.push({
            name: variableName,
            lineIndex: index,
            fullDeclaration: line.trim()
          });
        }
        break;
      }
    }
  });
  
  return declarations;
}

console.log('🔍 Finding and fixing unused variables and imports...');
processDirectory('src');

if (changes.length === 0) {
  console.log('✨ No unused variables or imports found!');
} else {
  console.log(`\n📊 Summary: Fixed ${changes.length} files`);
  changes.forEach(change => {
    console.log(`📁 ${change.file}: ${change.changes.length} fixes`);
  });
}
console.log('🎉 Unused variables cleanup completed!');