#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Common CSS properties that should not be prefixed
const CSS_PROPERTIES = [
  'flex', 'flexDirection', 'flexWrap', 'flexGrow', 'flexShrink', 'flexBasis',
  'position', 'top', 'right', 'bottom', 'left',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'marginVertical', 'marginHorizontal',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'paddingVertical', 'paddingHorizontal',
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'borderWidth', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
  'fontSize', 'fontWeight', 'fontStyle', 'fontFamily',
  'lineHeight', 'textAlign', 'textAlignVertical',
  'color', 'backgroundColor', 'borderColor',
  'opacity', 'zIndex',
  'shadowColor', 'shadowOffset', 'shadowOpacity', 'shadowRadius',
  'elevation', 'gap'
];

// Common variables that should not be prefixed
const COMMON_VARIABLES = [
  'type', 'distance', 'seconds', 'speed', 'theme'
];

// Interface properties that should not be prefixed
const INTERFACE_PROPERTIES = [
  'totalTrailsCompleted', 'totalDistance', 'totalTime', 'averageSpeed', 'averageTrailRating',
  'distanceTrend', 'speedTrend', 'difficultyTrend', 'consistencyScore', 'improvementRate',
  'recommendedTrails', 'optimalStartTime', 'preparationTips', 'riskFactors'
];

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
    let hasChanges = false;

    // Fix CSS properties in StyleSheet objects
    for (const prop of CSS_PROPERTIES) {
      const regex = new RegExp(`\\b_${prop}\\b`, 'g');
      if (regex.test(newContent)) {
        newContent = newContent.replace(regex, prop);
        hasChanges = true;
      }
    }

    // Fix common variables in function definitions and usage
    for (const variable of COMMON_VARIABLES) {
      // Fix function parameters: (distance: number) -> (_distance: number)
      const paramRegex = new RegExp(`\\b_${variable}:\\s*[\\w\\[\\]|\\s]+`, 'g');
      if (paramRegex.test(newContent)) {
        newContent = newContent.replace(paramRegex, (match) => match.replace(`_${variable}:`, `${variable}:`));
        hasChanges = true;
      }

      // Fix variable usage in function bodies
      const usageRegex = new RegExp(`\\b_${variable}\\b`, 'g');
      if (usageRegex.test(newContent)) {
        newContent = newContent.replace(usageRegex, variable);
        hasChanges = true;
      }
    }

    // Fix interface property access
    for (const prop of INTERFACE_PROPERTIES) {
      const regex = new RegExp(`\\._${prop}\\b`, 'g');
      if (regex.test(newContent)) {
        newContent = newContent.replace(regex, `.${prop}`);
        hasChanges = true;
      }
    }

    // Fix numeric literals that got prefixed (0._6 -> 0.6)
    const numericRegex = /(\d+)\._(\d+)/g;
    if (numericRegex.test(newContent)) {
      newContent = newContent.replace(numericRegex, '$1.$2');
      hasChanges = true;
    }

    // Fix shadow offset objects
    const shadowOffsetRegex = /shadowOffset:\s*\{\s*_width:/g;
    if (shadowOffsetRegex.test(newContent)) {
      newContent = newContent.replace(shadowOffsetRegex, 'shadowOffset: { width:');
      hasChanges = true;
    }

    const shadowHeightRegex = /_height:/g;
    if (shadowHeightRegex.test(newContent) && newContent.includes('shadowOffset')) {
      newContent = newContent.replace(shadowHeightRegex, 'height:');
      hasChanges = true;
    }

    // Fix specific React/TypeScript issues
    newContent = newContent.replace(/\bReactNode\b/g, 'React.ReactNode');
    newContent = newContent.replace(/\bErrorInfo\b/g, 'React.ErrorInfo');
    
    // Fix props parameter in constructors and functions
    newContent = newContent.replace(/super\(_props\)/g, 'super(props)');
    newContent = newContent.replace(/\(\.\.\._props\)/g, '(...props)');

    if (hasChanges) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
    }
    
  } catch (error) {
    console.log(`❌ Error processing ${filePath}:`, error.message);
  }
}

console.log('🔧 Fixing overly aggressive underscore prefixing...');
processDirectory('src');
processDirectory('.'); // For root level files like App.tsx
console.log('🎉 Prefixing fixes completed!');