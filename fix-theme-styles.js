#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
    
    // Check if this file was modified by the previous script and has theme references in StyleSheet
    if (content.includes('const styles = StyleSheet.create({') && content.includes('theme.')) {
      console.log(`🔧 Fixing theme references in: ${path.relative(process.cwd(), filePath)}`);
      
      const fixedContent = fixThemeStyleSheet(content);
      if (fixedContent !== content) {
        fs.writeFileSync(filePath, fixedContent, 'utf8');
        console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Error processing ${filePath}:`, error.message);
  }
}

function fixThemeStyleSheet(content) {
  const lines = content.split('\n');
  let newLines = [];
  let inStyleSheet = false;
  let styleSheetStart = -1;
  let styleSheetEnd = -1;
  
  // Find the StyleSheet.create block
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const styles = StyleSheet.create({')) {
      inStyleSheet = true;
      styleSheetStart = i;
    } else if (inStyleSheet && lines[i].includes('});') && lines[i].trim() === '});') {
      styleSheetEnd = i;
      break;
    }
  }
  
  if (styleSheetStart !== -1 && styleSheetEnd !== -1) {
    // Replace the StyleSheet with a function that takes theme as parameter
    const beforeStyleSheet = lines.slice(0, styleSheetStart);
    const afterStyleSheet = lines.slice(styleSheetEnd + 1);
    
    // Extract the component function to find where theme is defined
    let componentStart = -1;
    let componentName = '';
    
    for (let i = beforeStyleSheet.length - 1; i >= 0; i--) {
      if (beforeStyleSheet[i].includes('const ') && beforeStyleSheet[i].includes(' = ') && beforeStyleSheet[i].includes('=>')) {
        componentName = beforeStyleSheet[i].match(/const\s+(\w+)/)?.[1] || '';
        break;
      } else if (beforeStyleSheet[i].includes('export const ') && beforeStyleSheet[i].includes(' = ')) {
        componentName = beforeStyleSheet[i].match(/export const\s+(\w+)/)?.[1] || '';
        break;
      } else if (beforeStyleSheet[i].includes('function ')) {
        componentName = beforeStyleSheet[i].match(/function\s+(\w+)/)?.[1] || '';
        break;
      }
    }
    
    // Create the function-based StyleSheet
    const styleContent = lines.slice(styleSheetStart + 1, styleSheetEnd);
    const functionBasedStyles = [
      '',
      `const createStyles = (theme: any) => StyleSheet.create({`,
      ...styleContent,
      '});'
    ];
    
    // Find where theme is used in the component and add styles creation
    const updatedBeforeStyleSheet = [...beforeStyleSheet];
    let themeLineIndex = -1;
    
    for (let i = updatedBeforeStyleSheet.length - 1; i >= 0; i--) {
      if (updatedBeforeStyleSheet[i].includes('const theme = ') || 
          updatedBeforeStyleSheet[i].includes('createTheme(')) {
        themeLineIndex = i;
        break;
      }
    }
    
    if (themeLineIndex !== -1) {
      // Add styles creation after theme creation
      updatedBeforeStyleSheet.splice(themeLineIndex + 1, 0, '  const styles = createStyles(theme);');
    }
    
    newLines = [
      ...updatedBeforeStyleSheet,
      ...functionBasedStyles,
      ...afterStyleSheet
    ];
    
    return newLines.join('\n');
  }
  
  return content;
}

console.log('🔧 Fixing theme-based StyleSheet references...');
processDirectory('src');
console.log('🎉 Theme StyleSheet fixes completed!');