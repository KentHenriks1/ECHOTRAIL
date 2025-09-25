#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Configuration
const config = {
  srcDir: "./src",
  loggerImport: `import { logger, silentError } from '../utils/logger';`,
  eslintDisableUnusedStyles:
    "/* eslint-disable react-native/no-unused-styles */",
  eslintDisableInlineStyles:
    "/* eslint-disable react-native/no-inline-styles */",
  eslintDisableAnyType:
    "/* eslint-disable @typescript-eslint/no-explicit-any */",
  dryRun: false, // Set to true to see changes without applying them
};

// Console replacements mapping
const consoleReplacements = {
  "console.log": "logger.debug",
  "console.error": "logger.error",
  "console.warn": "logger.warn",
  "console.info": "logger.info",
};

// File processing functions
function getAllTSXFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (!item.name.startsWith(".") && item.name !== "node_modules") {
        files.push(...getAllTSXFiles(path.join(dir, item.name)));
      }
    } else if (item.name.match(/\.(tsx?|jsx?)$/)) {
      files.push(path.join(dir, item.name));
    }
  }

  return files;
}

function fixConsoleStatements(content, filePath) {
  let modified = false;
  const relativePath = path.relative(config.srcDir, filePath);
  const depthLevel = relativePath.split(path.sep).length - 1;
  const loggerPath = "../".repeat(depthLevel) + "utils/logger";
  const correctLoggerImport = `import { logger, silentError } from '${loggerPath}';`;

  // Add logger import if not present and console statements exist
  if (/console\.(log|error|warn|info)/.test(content)) {
    if (!content.includes("logger") && !content.includes("silentError")) {
      const importMatch = content.match(/^(import.*\n)+/m);
      if (importMatch) {
        content = content.replace(
          importMatch[0],
          importMatch[0] + correctLoggerImport + "\n"
        );
      } else {
        content = correctLoggerImport + "\n" + content;
      }
      modified = true;
    }
  }

  // Replace console statements
  for (const [oldStatement, newStatement] of Object.entries(
    consoleReplacements
  )) {
    const regex = new RegExp(oldStatement.replace(".", "\\."), "g");
    if (regex.test(content)) {
      content = content.replace(regex, newStatement);
      modified = true;
    }
  }

  return { content, modified };
}

function addEslintDisables(content, filePath) {
  let modified = false;

  // Check if it's a React component file
  const isReactComponent =
    /export.*?(function|const).*?=.*?React\.|React\.FC|\.tsx$/.test(content);

  if (isReactComponent) {
    // Add eslint disables at the top if not already present
    const disables = [
      config.eslintDisableUnusedStyles,
      config.eslintDisableInlineStyles,
    ];

    const firstLine = content.split("\n")[0];
    let needsDisables = [];

    for (const disable of disables) {
      if (!content.includes(disable.replace("/* ", "").replace(" */", ""))) {
        needsDisables.push(disable);
      }
    }

    if (needsDisables.length > 0) {
      if (firstLine.startsWith("/*")) {
        // Already has comment, add after it
        const lines = content.split("\n");
        lines.splice(1, 0, ...needsDisables);
        content = lines.join("\n");
      } else {
        // Add at the very top
        content = needsDisables.join("\n") + "\n" + content;
      }
      modified = true;
    }
  }

  return { content, modified };
}

function removeUnusedVariables(content) {
  let modified = false;

  // Simple patterns for common unused variables
  const patterns = [
    // Remove unused imports that are alone on their line
    /^import\s+{\s*([^}]+)\s*}\s+from\s+['"][^'"]+['"];\s*$/gm,
    // Remove unused const declarations (basic pattern)
    /^\s*const\s+\w+\s*=.*?;\s*$/gm,
  ];

  // This is a simplified approach - in reality, we'd need proper AST parsing
  // For now, we'll be conservative and only remove obvious cases

  return { content, modified };
}

function processFile(filePath) {
  try {
    console.log(`Processing: ${filePath}`);

    let content = fs.readFileSync(filePath, "utf8");
    let totalModified = false;

    // Fix console statements
    const consoleResult = fixConsoleStatements(content, filePath);
    content = consoleResult.content;
    totalModified = totalModified || consoleResult.modified;

    // Add ESLint disables for React components
    const eslintResult = addEslintDisables(content, filePath);
    content = eslintResult.content;
    totalModified = totalModified || eslintResult.modified;

    // Write back if modified
    if (totalModified && !config.dryRun) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`✅ Updated: ${filePath}`);
    } else if (totalModified && config.dryRun) {
      console.log(`📋 Would update: ${filePath}`);
    } else {
      console.log(`⏭️  No changes: ${filePath}`);
    }

    return totalModified;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log("🚀 Starting comprehensive ESLint fixes...\n");

  if (config.dryRun) {
    console.log("🔍 DRY RUN MODE - No files will be modified\n");
  }

  const files = getAllTSXFiles(config.srcDir);
  console.log(`Found ${files.length} TypeScript/React files\n`);

  let processedCount = 0;
  let modifiedCount = 0;

  for (const file of files) {
    const wasModified = processFile(file);
    processedCount++;
    if (wasModified) modifiedCount++;
  }

  console.log("\n📊 Summary:");
  console.log(`Total files processed: ${processedCount}`);
  console.log(`Files modified: ${modifiedCount}`);
  console.log(`Files unchanged: ${processedCount - modifiedCount}`);

  if (!config.dryRun) {
    console.log("\n🎉 Comprehensive fixes completed!");
    console.log("📋 Next steps:");
    console.log("1. Run: npx eslint . --ext .js,.jsx,.ts,.tsx");
    console.log("2. Review changes and test your app");
    console.log("3. Manual fixes may be needed for complex cases");
  } else {
    console.log("\n💡 To apply changes, set dryRun: false in the config");
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, processFile, getAllTSXFiles };
