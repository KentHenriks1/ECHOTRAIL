const fs = require('fs');

try {
  const rawContent = fs.readFileSync('knip-report.json', 'utf8');
  
  // Extract JSON from mixed output
  const jsonStart = rawContent.indexOf('{');
  const jsonContent = rawContent.substring(jsonStart);
  
  const data = JSON.parse(jsonContent);

  console.log('='.repeat(80));
  console.log('KNIP UNUSED CODE DETECTION REPORT');
  console.log('='.repeat(80));
  console.log();

  // Unused files analysis
  console.log('📄 UNUSED FILES FOUND');
  console.log('-'.repeat(30));
  if (data.files && data.files.length > 0) {
    console.log(`Total unused files: ${data.files.length}`);
    console.log();
    
    data.files.slice(0, 10).forEach((file, index) => {
      const shortPath = file.replace(/^src\//, '');
      console.log(`${index + 1}. ${shortPath}`);
    });
    
    if (data.files.length > 10) {
      console.log(`... and ${data.files.length - 10} more files`);
    }
  } else {
    console.log('✅ No unused files detected');
  }
  console.log();

  // Dependencies analysis
  const packageIssue = data.issues?.find(issue => issue.file === 'package.json');
  if (packageIssue) {
    console.log('📦 DEPENDENCY ANALYSIS');
    console.log('-'.repeat(30));
    
    if (packageIssue.dependencies?.length > 0) {
      console.log(`Unused dependencies: ${packageIssue.dependencies.length}`);
      packageIssue.dependencies.slice(0, 5).forEach((dep, index) => {
        console.log(`${index + 1}. ${dep.name}`);
      });
      if (packageIssue.dependencies.length > 5) {
        console.log(`... and ${packageIssue.dependencies.length - 5} more`);
      }
      console.log();
    }
    
    if (packageIssue.devDependencies?.length > 0) {
      console.log(`Unused devDependencies: ${packageIssue.devDependencies.length}`);
      packageIssue.devDependencies.slice(0, 5).forEach((dep, index) => {
        console.log(`${index + 1}. ${dep.name}`);
      });
      if (packageIssue.devDependencies.length > 5) {
        console.log(`... and ${packageIssue.devDependencies.length - 5} more`);
      }
      console.log();
    }

    if (packageIssue.binaries?.length > 0) {
      console.log(`Unused binaries: ${packageIssue.binaries.length}`);
      packageIssue.binaries.slice(0, 8).forEach((bin, index) => {
        console.log(`${index + 1}. ${bin.name}`);
      });
      if (packageIssue.binaries.length > 8) {
        console.log(`... and ${packageIssue.binaries.length - 8} more`);
      }
    }
  }
  console.log();

  // Exports analysis
  console.log('🔄 UNUSED EXPORTS ANALYSIS');
  console.log('-'.repeat(30));
  let totalUnusedExports = 0;
  let filesWithUnusedExports = 0;

  data.issues?.forEach(issue => {
    const exportCount = (issue.exports?.length || 0) + (issue.types?.length || 0);
    if (exportCount > 0) {
      totalUnusedExports += exportCount;
      filesWithUnusedExports++;
    }
  });

  console.log(`Files with unused exports: ${filesWithUnusedExports}`);
  console.log(`Total unused exports: ${totalUnusedExports}`);
  console.log();

  // Top files with unused exports
  const filesWithExports = data.issues
    ?.filter(issue => (issue.exports?.length || 0) + (issue.types?.length || 0) > 0)
    .sort((a, b) => ((b.exports?.length || 0) + (b.types?.length || 0)) - ((a.exports?.length || 0) + (a.types?.length || 0)))
    .slice(0, 5);

  if (filesWithExports?.length > 0) {
    console.log('📁 TOP FILES WITH UNUSED EXPORTS');
    console.log('-'.repeat(30));
    filesWithExports.forEach((issue, index) => {
      const shortPath = issue.file.replace(/^src\//, '');
      const exportCount = (issue.exports?.length || 0) + (issue.types?.length || 0);
      console.log(`${index + 1}. ${shortPath}: ${exportCount} unused exports`);
    });
  }
  console.log();

  // Summary and recommendations
  console.log('💡 CLEANUP OPPORTUNITIES');
  console.log('-'.repeat(30));
  
  const cleanupOpportunities = [];
  
  if (data.files?.length > 0) {
    cleanupOpportunities.push(`Remove ${data.files.length} unused files to reduce codebase size`);
  }
  
  if (packageIssue?.dependencies?.length > 0) {
    cleanupOpportunities.push(`Uninstall ${packageIssue.dependencies.length} unused dependencies`);
  }
  
  if (packageIssue?.devDependencies?.length > 0) {
    cleanupOpportunities.push(`Remove ${packageIssue.devDependencies.length} unused devDependencies`);
  }
  
  if (totalUnusedExports > 0) {
    cleanupOpportunities.push(`Clean up ${totalUnusedExports} unused exports across ${filesWithUnusedExports} files`);
  }

  if (cleanupOpportunities.length === 0) {
    console.log('✅ No major cleanup opportunities found!');
    console.log('📊 The codebase appears to be well-maintained.');
  } else {
    cleanupOpportunities.forEach((opportunity, index) => {
      console.log(`${index + 1}. ${opportunity}`);
    });
  }

  console.log();
  console.log('⚡ IMPACT ASSESSMENT');
  console.log('-'.repeat(30));
  
  const totalFiles = data.files?.length || 0;
  const totalDeps = (packageIssue?.dependencies?.length || 0) + (packageIssue?.devDependencies?.length || 0);
  
  if (totalFiles > 20 || totalDeps > 10) {
    console.log('🔥 HIGH IMPACT - Significant cleanup potential');
  } else if (totalFiles > 5 || totalDeps > 5 || totalUnusedExports > 20) {
    console.log('⚠️  MEDIUM IMPACT - Moderate cleanup beneficial');
  } else {
    console.log('✅ LOW IMPACT - Codebase is relatively clean');
  }
  
  console.log(`Bundle size impact: ${totalFiles > 10 ? 'Significant' : totalFiles > 5 ? 'Moderate' : 'Minimal'}`);
  console.log(`Dependency impact: ${totalDeps > 15 ? 'High' : totalDeps > 5 ? 'Medium' : 'Low'}`);

} catch (error) {
  console.error('Error analyzing Knip report:', error.message);
  console.log('\nTrying alternative approach...');
  
  try {
    // Alternative: run knip directly with simple output
    const { execSync } = require('child_process');
    console.log('\nRunning Knip analysis...');
    const output = execSync('npx knip --reporter compact', { encoding: 'utf8', stdio: 'pipe' });
    console.log(output);
  } catch (fallbackError) {
    console.error('Fallback analysis failed:', fallbackError.message);
  }
}