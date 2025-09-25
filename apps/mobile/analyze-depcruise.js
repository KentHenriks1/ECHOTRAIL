const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('depcruise-report.json', 'utf8'));

  console.log('='.repeat(80));
  console.log('DEPENDENCY CRUISER ARCHITECTURE ANALYSIS');
  console.log('='.repeat(80));
  console.log();

  // Summary statistics
  const modules = data.modules || [];
  const totalModules = modules.length;
  const totalDependencies = modules.reduce((sum, module) => sum + (module.dependencies?.length || 0), 0);
  
  console.log('📊 ARCHITECTURE OVERVIEW');
  console.log('-'.repeat(30));
  console.log(`Total modules analyzed: ${totalModules}`);
  console.log(`Total dependencies: ${totalDependencies}`);
  console.log(`Average dependencies per module: ${(totalDependencies / totalModules).toFixed(1)}`);
  console.log();

  // Circular dependencies
  console.log('🔄 CIRCULAR DEPENDENCIES');
  console.log('-'.repeat(30));
  
  const circularDeps = [];
  modules.forEach(module => {
    if (module.dependencies) {
      module.dependencies.forEach(dep => {
        if (dep.circular) {
          circularDeps.push({
            from: module.source,
            to: dep.resolved,
            circular: dep.circular
          });
        }
      });
    }
  });

  if (circularDeps.length > 0) {
    console.log(`⚠️  Found ${circularDeps.length} circular dependencies:`);
    console.log();
    
    // Group circular dependencies
    const circularGroups = {};
    circularDeps.forEach(dep => {
      const key = [dep.from, dep.to].sort().join(' <-> ');
      if (!circularGroups[key]) {
        circularGroups[key] = [];
      }
      circularGroups[key].push(dep);
    });

    Object.entries(circularGroups).slice(0, 10).forEach(([key, deps], index) => {
      console.log(`${index + 1}. ${key.replace('src/', '').replace('src\\', '')}`);
    });

    if (Object.keys(circularGroups).length > 10) {
      console.log(`... and ${Object.keys(circularGroups).length - 10} more circular dependency groups`);
    }
  } else {
    console.log('✅ No circular dependencies detected!');
  }
  console.log();

  // Module complexity analysis
  console.log('📈 MODULE COMPLEXITY ANALYSIS');
  console.log('-'.repeat(30));
  
  const moduleComplexity = modules
    .map(module => ({
      path: module.source.replace(/^src[/\\]/, ''),
      dependencies: module.dependencies?.length || 0,
      dependents: modules.filter(m => 
        m.dependencies?.some(dep => dep.resolved === module.source)
      ).length
    }))
    .sort((a, b) => (b.dependencies + b.dependents) - (a.dependencies + a.dependents));

  console.log('Top 10 most complex modules:');
  moduleComplexity.slice(0, 10).forEach((module, index) => {
    console.log(`${index + 1}. ${module.path}`);
    console.log(`   Dependencies: ${module.dependencies}, Dependents: ${module.dependents}`);
  });
  console.log();

  // Layer violations
  console.log('🏗️  ARCHITECTURAL LAYERS');
  console.log('-'.repeat(30));
  
  const layers = {
    'UI/Screens': modules.filter(m => m.source.includes('screens') || m.source.includes('components')).length,
    'Services': modules.filter(m => m.source.includes('services')).length,
    'Core/Utils': modules.filter(m => m.source.includes('core') || m.source.includes('utils')).length,
    'Types': modules.filter(m => m.source.includes('types')).length,
    'Navigation': modules.filter(m => m.source.includes('navigation')).length,
    'Other': 0
  };
  
  layers.Other = totalModules - Object.values(layers).slice(0, -1).reduce((sum, count) => sum + count, 0);

  Object.entries(layers).forEach(([layer, count]) => {
    const percentage = ((count / totalModules) * 100).toFixed(1);
    console.log(`${layer}: ${count} modules (${percentage}%)`);
  });
  console.log();

  // Dependency violations (simplified heuristics)
  console.log('⚠️  POTENTIAL ARCHITECTURAL VIOLATIONS');
  console.log('-'.repeat(30));
  
  const violations = [];
  
  modules.forEach(module => {
    if (module.source.includes('components') || module.source.includes('screens')) {
      // UI layer should not depend directly on deep core modules
      module.dependencies?.forEach(dep => {
        if (dep.resolved.includes('core/database') || dep.resolved.includes('core/cache')) {
          violations.push({
            type: 'UI-to-Core',
            from: module.source,
            to: dep.resolved,
            description: 'UI component directly importing core infrastructure'
          });
        }
      });
    }
    
    if (module.source.includes('core/utils')) {
      // Utils should not depend on UI or services
      module.dependencies?.forEach(dep => {
        if (dep.resolved.includes('screens') || dep.resolved.includes('components') || dep.resolved.includes('services')) {
          violations.push({
            type: 'Utils-to-UI',
            from: module.source,
            to: dep.resolved,
            description: 'Utility module importing UI/service components'
          });
        }
      });
    }
  });

  if (violations.length > 0) {
    console.log(`Found ${violations.length} potential violations:`);
    violations.slice(0, 5).forEach((violation, index) => {
      console.log(`${index + 1}. ${violation.type}: ${violation.description}`);
      console.log(`   ${violation.from.replace('src/', '')} -> ${violation.to.replace('src/', '')}`);
    });
    if (violations.length > 5) {
      console.log(`... and ${violations.length - 5} more violations`);
    }
  } else {
    console.log('✅ No obvious architectural violations detected');
  }
  console.log();

  // Orphaned modules
  console.log('🏝️  ORPHANED MODULES');
  console.log('-'.repeat(30));
  
  const orphanedModules = modules.filter(module => {
    const hasDependents = modules.some(m => 
      m.dependencies?.some(dep => dep.resolved === module.source)
    );
    const hasDependencies = (module.dependencies?.length || 0) === 0;
    return !hasDependents && hasDependencies && !module.source.includes('index.');
  });

  if (orphanedModules.length > 0) {
    console.log(`Found ${orphanedModules.length} potentially orphaned modules:`);
    orphanedModules.slice(0, 8).forEach((module, index) => {
      console.log(`${index + 1}. ${module.source.replace('src/', '')}`);
    });
    if (orphanedModules.length > 8) {
      console.log(`... and ${orphanedModules.length - 8} more orphaned modules`);
    }
  } else {
    console.log('✅ No orphaned modules detected');
  }
  console.log();

  // Summary and recommendations
  console.log('💡 ARCHITECTURE RECOMMENDATIONS');
  console.log('-'.repeat(30));
  
  const recommendations = [];
  
  if (circularDeps.length > 0) {
    recommendations.push(`Resolve ${circularDeps.length} circular dependencies to improve maintainability`);
  }
  
  if (violations.length > 0) {
    recommendations.push(`Address ${violations.length} architectural violations`);
  }
  
  if (orphanedModules.length > 0) {
    recommendations.push(`Review ${orphanedModules.length} orphaned modules for removal`);
  }
  
  if (moduleComplexity[0]?.dependencies > 20) {
    recommendations.push(`Refactor highly complex modules with 20+ dependencies`);
  }
  
  if (recommendations.length === 0) {
    console.log('✅ Architecture appears well-structured!');
    console.log('📊 No major issues detected in dependency structure');
  } else {
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }
  
  console.log();
  console.log('📊 ARCHITECTURE HEALTH SCORE');
  console.log('-'.repeat(30));
  
  let healthScore = 100;
  
  // Deduct points for issues
  healthScore -= Math.min(circularDeps.length * 5, 30);
  healthScore -= Math.min(violations.length * 3, 25);
  healthScore -= Math.min(orphanedModules.length * 2, 20);
  
  // Bonus for good practices
  if (layers['Services'] > 0) healthScore += 5;
  if (layers['Core/Utils'] > 0) healthScore += 5;
  
  healthScore = Math.max(0, Math.min(100, healthScore));
  
  if (healthScore >= 80) {
    console.log(`🟢 EXCELLENT (${healthScore}/100) - Well-architected codebase`);
  } else if (healthScore >= 60) {
    console.log(`🟡 GOOD (${healthScore}/100) - Minor architectural issues`);
  } else {
    console.log(`🔴 NEEDS IMPROVEMENT (${healthScore}/100) - Significant architectural issues`);
  }

} catch (error) {
  console.error('Error analyzing Dependency Cruiser report:', error.message);
  console.log('\nTrying to run direct analysis...');
  
  try {
    const { execSync } = require('child_process');
    console.log('Running Dependency Cruiser...');
    const output = execSync('npx depcruise src --output-type err', { encoding: 'utf8' });
    console.log(output);
  } catch (fallbackError) {
    console.error('Direct analysis failed:', fallbackError.message);
  }
}