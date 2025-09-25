#!/usr/bin/env node

/**
 * Setup GitHub repository labels for EchoTrail
 * This script creates standardized labels for issues and pull requests
 */

const { execSync } = require('child_process');

// Define labels with colors and descriptions
const labels = [
  // Type labels
  { name: 'bug', color: 'd73a49', description: '🐛 Something isn\'t working' },
  { name: 'enhancement', color: '0052cc', description: '🚀 New feature or improvement' },
  { name: 'documentation', color: '1d76db', description: '📚 Improvements or additions to documentation' },
  { name: 'question', color: 'cc317c', description: '❓ Further information is requested' },
  
  // Priority labels
  { name: 'priority-low', color: '0e8a16', description: '🔽 Low priority' },
  { name: 'priority-medium', color: 'fbca04', description: '🔶 Medium priority' },
  { name: 'priority-high', color: 'ff9500', description: '🔼 High priority' },
  { name: 'priority-critical', color: 'd93f0b', description: '🚨 Critical priority' },
  
  // Status labels
  { name: 'needs-triage', color: 'fbca04', description: '🔍 Needs initial review and categorization' },
  { name: 'needs-review', color: 'ff9500', description: '👀 Waiting for code review' },
  { name: 'needs-testing', color: 'ff9500', description: '🧪 Needs testing before merge' },
  { name: 'ready-for-merge', color: '0052cc', description: '✅ Ready to be merged' },
  { name: 'blocked', color: 'd93f0b', description: '🚫 Blocked by dependencies or issues' },
  { name: 'wip', color: 'fbca04', description: '🚧 Work in progress' },
  
  // Component labels
  { name: 'ai-storytelling', color: '9c27b0', description: '🧠 AI story generation and personalization' },
  { name: 'maps-navigation', color: '4caf50', description: '🗺️ Maps and navigation features' },
  { name: 'audio-tts', color: 'ff5722', description: '🎵 Audio playback and TTS integration' },
  { name: 'database', color: '795548', description: '🗄️ Database related changes' },
  { name: 'authentication', color: '607d8b', description: '🔐 User authentication and security' },
  { name: 'ui-ux', color: 'e91e63', description: '🎨 User interface and experience' },
  { name: 'performance', color: 'ff9800', description: '⚡ Performance improvements' },
  { name: 'testing', color: '2196f3', description: '🧪 Testing and quality assurance' },
  
  // Platform labels
  { name: 'ios', color: '000000', description: '📱 iOS specific issues' },
  { name: 'android', color: '3ddc84', description: '🤖 Android specific issues' },
  { name: 'expo', color: '000020', description: '⚫ Expo platform specific' },
  
  // Community labels
  { name: 'good-first-issue', color: '7057ff', description: '👋 Good for newcomers' },
  { name: 'help-wanted', color: '008672', description: '🤝 Extra attention is needed' },
  { name: 'community', color: '0e8a16', description: '👥 Community contribution' },
  { name: 'norwegian-hiking', color: 'ff0000', description: '🏔️ Norwegian hiking specific' },
  
  // Special labels
  { name: 'duplicate', color: 'cfd3d7', description: '♻️ This issue or pull request already exists' },
  { name: 'invalid', color: 'e4e669', description: '❌ This doesn\'t seem right' },
  { name: 'wontfix', color: 'ffffff', description: '🚫 This will not be worked on' },
  { name: 'breaking-change', color: 'd93f0b', description: '💥 Breaking change that affects existing functionality' },
];

function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    console.error(`Error running command: ${command}`);
    console.error(error.message);
    return null;
  }
}

function createLabel(label) {
  const command = `gh label create "${label.name}" --description "${label.description}" --color "${label.color}"`;
  console.log(`Creating label: ${label.name}`);
  
  const result = runCommand(command);
  if (result !== null) {
    console.log(`✅ Created label: ${label.name}`);
  } else {
    console.log(`⚠️  Label might already exist: ${label.name}`);
  }
}

function updateLabel(label) {
  const command = `gh label edit "${label.name}" --description "${label.description}" --color "${label.color}"`;
  console.log(`Updating label: ${label.name}`);
  
  const result = runCommand(command);
  if (result !== null) {
    console.log(`✅ Updated label: ${label.name}`);
  } else {
    console.log(`❌ Failed to update label: ${label.name}`);
  }
}

function setupLabels() {
  console.log('🏷️  Setting up GitHub repository labels for EchoTrail...\n');
  
  // Check if GitHub CLI is available
  const ghCheck = runCommand('gh --version');
  if (!ghCheck) {
    console.error('❌ GitHub CLI (gh) is not installed or not in PATH');
    console.error('Install it from: https://cli.github.com/');
    process.exit(1);
  }
  
  console.log('✅ GitHub CLI is available');
  
  // Check authentication
  const authCheck = runCommand('gh auth status');
  if (!authCheck) {
    console.error('❌ Not authenticated with GitHub');
    console.error('Run: gh auth login');
    process.exit(1);
  }
  
  console.log('✅ GitHub authentication verified\n');
  
  // Get existing labels
  console.log('📋 Fetching existing labels...');
  const existingLabelsRaw = runCommand('gh label list --json name');
  let existingLabels = [];
  
  if (existingLabelsRaw) {
    try {
      existingLabels = JSON.parse(existingLabelsRaw).map(label => label.name);
      console.log(`Found ${existingLabels.length} existing labels\n`);
    } catch (error) {
      console.error('Error parsing existing labels');
    }
  }
  
  // Process each label
  labels.forEach((label, index) => {
    console.log(`[${index + 1}/${labels.length}] Processing: ${label.name}`);
    
    if (existingLabels.includes(label.name)) {
      updateLabel(label);
    } else {
      createLabel(label);
    }
    
    console.log(); // Add spacing
  });
  
  console.log('🎉 GitHub labels setup complete!');
  console.log('\n📝 Summary:');
  console.log(`- Processed ${labels.length} labels`);
  console.log('- Labels are now ready for use in issues and pull requests');
  console.log('- Contributors can use these labels to categorize their work');
}

// Run the script
if (require.main === module) {
  setupLabels();
}

module.exports = { setupLabels, labels };