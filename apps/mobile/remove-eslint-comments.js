#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function processDirectory(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      // Skip node_modules and .expo directories
      if (item.name !== 'node_modules' && item.name !== '.expo' && item.name !== 'android' && item.name !== 'ios') {
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
    
    // Remove eslint disable comments at the start of files
    const lines = content.split('\n');
    let newLines = [];
    let skipNext = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip eslint-disable comments at the top of files
      if (i < 10 && line.trim().startsWith('/* eslint-disable')) {
        continue;
      }
      
      newLines.push(line);
    }
    
    const newContent = newLines.join('\n');
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Cleaned: ${filePath}`);
    }
  } catch (error) {
    console.log(`❌ Error processing ${filePath}:`, error.message);
  }
}

console.log('🧹 Removing unnecessary ESLint disable comments...');
processDirectory('src');
console.log('🎉 Cleanup completed!');