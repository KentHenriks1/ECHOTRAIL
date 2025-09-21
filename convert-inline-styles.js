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
    const lines = content.split('\n');
    
    let hasInlineStyles = false;
    let hasStyleSheet = false;
    let styleSheetImported = false;
    
    // Check if file has StyleSheet import
    const imports = lines.filter(line => line.trim().startsWith('import'));
    const reactNativeImport = imports.find(line => line.includes('from "react-native"') || line.includes('from \'react-native\''));
    
    if (reactNativeImport && reactNativeImport.includes('StyleSheet')) {
      styleSheetImported = true;
    }
    
    // Look for inline styles and existing StyleSheet
    for (const line of lines) {
      // Check for inline styles (style={{ ... }})
      if (line.includes('style={{') && !line.includes('styles.')) {
        hasInlineStyles = true;
      }
      
      // Check if StyleSheet.create is already used
      if (line.includes('StyleSheet.create') || line.includes('createStyles')) {
        hasStyleSheet = true;
      }
    }
    
    if (hasInlineStyles) {
      console.log(`📍 Found inline styles in: ${path.relative(process.cwd(), filePath)}`);
      const convertedContent = convertInlineStylesToStyleSheet(content, hasStyleSheet, styleSheetImported);
      
      if (convertedContent !== content) {
        fs.writeFileSync(filePath, convertedContent, 'utf8');
        changes.push({
          file: filePath,
          changes: ['Converted inline styles to StyleSheet']
        });
        console.log(`✅ Converted: ${path.relative(process.cwd(), filePath)}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Error processing ${filePath}:`, error.message);
  }
}

function convertInlineStylesToStyleSheet(content, hasExistingStyleSheet, hasStyleSheetImport) {
  let newContent = content;
  
  // Add StyleSheet import if not present
  if (!hasStyleSheetImport) {
    newContent = addStyleSheetImport(newContent);
  }
  
  // Extract inline styles
  const inlineStyles = extractInlineStyles(newContent);
  
  if (inlineStyles.length === 0) {
    return newContent;
  }
  
  // Generate style names and StyleSheet object
  const styleMap = generateStyleNames(inlineStyles);
  const styleSheetCode = generateStyleSheetCode(styleMap);
  
  // Replace inline styles with style references
  for (const [original, styleName] of Object.entries(styleMap)) {
    const regex = new RegExp(`style\\s*=\\s*\\{\\{([^}]+)\\}\\}`, 'g');
    newContent = newContent.replace(regex, (match, styleContent) => {
      const normalizedStyle = normalizeStyleContent(styleContent);
      const originalNormalized = normalizeStyleContent(original);
      
      if (normalizedStyle === originalNormalized) {
        return `style={styles.${styleName}}`;
      }
      return match;
    });
  }
  
  // Add StyleSheet at the end of the file
  if (!hasExistingStyleSheet) {
    newContent = addStyleSheetAtEnd(newContent, styleSheetCode);
  } else {
    // Try to merge with existing StyleSheet
    newContent = mergeWithExistingStyleSheet(newContent, styleMap);
  }
  
  return newContent;
}

function addStyleSheetImport(content) {
  const lines = content.split('\n');
  let insertIndex = -1;
  
  // Find React Native import line
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('from "react-native"') || lines[i].includes('from \'react-native\'')) {
      const importLine = lines[i];
      if (!importLine.includes('StyleSheet')) {
        // Add StyleSheet to existing import
        const updatedImport = importLine.replace(
          /from ['"]react-native['"]/, 
          (match) => {
            const beforeMatch = importLine.substring(0, importLine.indexOf(match));
            if (beforeMatch.includes('{') && beforeMatch.includes('}')) {
              // Named imports exist, add StyleSheet
              return importLine.replace(/\}/, ', StyleSheet}');
            } else {
              // No named imports, create them
              return importLine.replace(/import\s+/, 'import { StyleSheet } ');
            }
          }
        );
        lines[i] = updatedImport;
        return lines.join('\n');
      }
      break;
    }
  }
  
  // If no React Native import found, add it
  const firstImportIndex = lines.findIndex(line => line.trim().startsWith('import'));
  if (firstImportIndex !== -1) {
    lines.splice(firstImportIndex, 0, 'import { StyleSheet } from "react-native";');
  }
  
  return lines.join('\n');
}

function extractInlineStyles(content) {
  const styleRegex = /style\s*=\s*\{\{([^}]+)\}\}/g;
  const inlineStyles = [];
  let match;
  
  while ((match = styleRegex.exec(content)) !== null) {
    const styleContent = match[1].trim();
    if (styleContent && !inlineStyles.includes(styleContent)) {
      inlineStyles.push(styleContent);
    }
  }
  
  return inlineStyles;
}

function generateStyleNames(inlineStyles) {
  const styleMap = {};
  const usedNames = new Set();
  
  inlineStyles.forEach((style, index) => {
    let baseName = 'inlineStyle';
    
    // Try to generate meaningful names from style properties
    const properties = style.split(',').map(prop => prop.trim());
    const firstProp = properties[0];
    
    if (firstProp) {
      const propName = firstProp.split(':')[0].trim();
      // Convert camelCase to meaningful name
      if (propName === 'flexDirection') baseName = 'row';
      else if (propName === 'justifyContent') baseName = 'centered';
      else if (propName === 'alignItems') baseName = 'aligned';
      else if (propName === 'backgroundColor') baseName = 'backgroundStyle';
      else if (propName === 'padding') baseName = 'padded';
      else if (propName === 'margin') baseName = 'spaced';
      else if (propName === 'position') baseName = 'positioned';
      else if (propName === 'flex') baseName = 'flexible';
      else baseName = propName.replace(/[A-Z]/g, letter => letter.toLowerCase());
    }
    
    let finalName = baseName;
    let counter = 1;
    
    while (usedNames.has(finalName)) {
      finalName = `${baseName}${counter}`;
      counter++;
    }
    
    usedNames.add(finalName);
    styleMap[style] = finalName;
  });
  
  return styleMap;
}

function generateStyleSheetCode(styleMap) {
  let styleSheetObj = 'const styles = StyleSheet.create({\n';
  
  for (const [styleContent, styleName] of Object.entries(styleMap)) {
    styleSheetObj += `  ${styleName}: {\n`;
    
    const properties = styleContent.split(',').map(prop => prop.trim());
    for (const prop of properties) {
      if (prop) {
        styleSheetObj += `    ${prop},\n`;
      }
    }
    
    styleSheetObj += '  },\n';
  }
  
  styleSheetObj += '});';
  return styleSheetObj;
}

function normalizeStyleContent(styleContent) {
  return styleContent
    .split(',')
    .map(prop => prop.trim())
    .sort()
    .join(',');
}

function addStyleSheetAtEnd(content, styleSheetCode) {
  const lines = content.split('\n');
  
  // Find the last non-empty line
  let insertIndex = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() !== '') {
      insertIndex = i + 1;
      break;
    }
  }
  
  // Add some spacing and the StyleSheet
  lines.splice(insertIndex, 0, '', styleSheetCode);
  
  return lines.join('\n');
}

function mergeWithExistingStyleSheet(content, styleMap) {
  // This is a simplified version - in a real implementation, 
  // we'd parse the existing StyleSheet and merge intelligently
  const lines = content.split('\n');
  
  // Find existing StyleSheet.create
  let styleSheetStartIndex = -1;
  let styleSheetEndIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('StyleSheet.create') || lines[i].includes('createStyles')) {
      styleSheetStartIndex = i;
      // Find the closing brace
      let braceCount = 0;
      for (let j = i; j < lines.length; j++) {
        if (lines[j].includes('{')) braceCount++;
        if (lines[j].includes('}')) braceCount--;
        if (braceCount === 0) {
          styleSheetEndIndex = j;
          break;
        }
      }
      break;
    }
  }
  
  if (styleSheetStartIndex !== -1 && styleSheetEndIndex !== -1) {
    // Add new styles before the closing brace
    const newStyleLines = [];
    for (const [styleContent, styleName] of Object.entries(styleMap)) {
      newStyleLines.push(`  ${styleName}: {`);
      
      const properties = styleContent.split(',').map(prop => prop.trim());
      for (const prop of properties) {
        if (prop) {
          newStyleLines.push(`    ${prop},`);
        }
      }
      newStyleLines.push('  },');
    }
    
    lines.splice(styleSheetEndIndex, 0, ...newStyleLines);
  }
  
  return lines.join('\n');
}

console.log('🎨 Converting inline styles to StyleSheet objects...');
processDirectory('src');

if (changes.length === 0) {
  console.log('✨ No inline styles found that needed conversion!');
} else {
  console.log(`\n📊 Summary: Converted inline styles in ${changes.length} files`);
  changes.forEach(change => {
    console.log(`📁 ${path.relative(process.cwd(), change.file)}`);
  });
}
console.log('🎉 Inline style conversion completed!');