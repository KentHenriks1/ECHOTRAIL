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
    const lines = content.split('\n');
    
    let hasInlineStyles = false;
    let inlineStylesLines = [];
    
    // Look for inline styles
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check for inline styles (style={{ ... }}) that are not already using styles.
      if (line.includes('style={{') && !line.includes('styles.')) {
        hasInlineStyles = true;
        inlineStylesLines.push({
          lineNumber: i + 1,
          content: line.trim()
        });
      }
    }
    
    if (hasInlineStyles) {
      console.log(`\n📍 Remaining inline styles in: ${path.relative(process.cwd(), filePath)}`);
      inlineStylesLines.forEach(item => {
        console.log(`  Line ${item.lineNumber}: ${item.content}`);
      });
      
      const convertedContent = manuallyConvertInlineStyles(content, filePath);
      if (convertedContent !== content) {
        fs.writeFileSync(filePath, convertedContent, 'utf8');
        console.log(`✅ Converted remaining styles in: ${path.relative(process.cwd(), filePath)}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Error processing ${filePath}:`, error.message);
  }
}

function manuallyConvertInlineStyles(content, filePath) {
  let newContent = content;
  
  // Convert the remaining View with inline styles in AuthNavigator
  if (filePath.includes('AuthNavigator.tsx')) {
    newContent = newContent.replace(
      /style={StyleSheet\.flatten\(\[\s*{\s*flex:\s*1,\s*justifyContent:\s*"center",\s*alignItems:\s*"center",\s*backgroundColor:\s*theme\.colors\.background,\s*padding:\s*theme\.spacing\.lg,\s*},\s*\]\)}/g,
      'style={styles.container}'
    );
    
    // Add container style to the createStyles function
    newContent = newContent.replace(
      /const createStyles = \(theme: any\) => StyleSheet\.create\({/,
      `const createStyles = (theme: any) => StyleSheet.create({\n  container: {\n    flex: 1,\n    justifyContent: "center",\n    alignItems: "center",\n    backgroundColor: theme.colors.background,\n    padding: theme.spacing.lg,\n  },`
    );
  }
  
  // Handle other common inline style patterns
  newContent = convertCommonInlineStyles(newContent);
  
  return newContent;
}

function convertCommonInlineStyles(content) {
  let newContent = content;
  
  // Convert simple flex: 1 styles
  newContent = newContent.replace(
    /style=\{\{\s*flex:\s*1\s*\}\}/g,
    'style={styles.flex1}'
  );
  
  // Convert simple opacity styles
  newContent = newContent.replace(
    /style=\{\{\s*opacity:\s*[\d.]+\s*\}\}/g,
    'style={styles.fadeStyle}'
  );
  
  // Convert transform scale styles
  newContent = newContent.replace(
    /style=\{\{\s*transform:\s*\[[\s\S]*?\]\s*\}\}/g,
    'style={styles.transformStyle}'
  );
  
  return newContent;
}

console.log('🔍 Looking for remaining inline styles...');
processDirectory('src');
console.log('🎉 Remaining inline styles check completed!');