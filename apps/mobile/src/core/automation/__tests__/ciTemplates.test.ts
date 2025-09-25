/**
 * Unit tests for CI Templates
 */

import { 
  generateGitHubWorkflow,
  generateGitLabWorkflow, 
  generateJenkinsfile 
} from '../ciTemplates';

describe('CI Templates', () => {
  describe('generateGitHubWorkflow', () => {
    it('should generate valid GitHub Actions workflow', () => {
      const workflow = generateGitHubWorkflow();
      
      expect(workflow).toBeDefined();
      expect(typeof workflow).toBe('string');
      expect(workflow).toContain('name: Metro Build Pipeline');
      expect(workflow).toContain('on:');
      expect(workflow).toContain('push:');
      expect(workflow).toContain('pull_request:');
      expect(workflow).toContain('jobs:');
      expect(workflow).toContain('metro-build:');
    });

    it('should include all required GitHub Actions steps', () => {
      const workflow = generateGitHubWorkflow();
      
      expect(workflow).toContain('actions/checkout@v4');
      expect(workflow).toContain('actions/setup-node@v4');
      expect(workflow).toContain('npm ci');
      expect(workflow).toContain('npx ts-node');
      expect(workflow).toContain('MetroBuildPipeline');
    });

    it('should include artifact upload and reports', () => {
      const workflow = generateGitHubWorkflow();
      
      expect(workflow).toContain('actions/upload-artifact@v4');
      expect(workflow).toContain('build-reports');
      expect(workflow).toContain('metro-analysis-results');
      expect(workflow).toContain('dist/');
    });

    it('should have proper matrix strategy for platforms and environments', () => {
      const workflow = generateGitHubWorkflow();
      
      expect(workflow).toContain('matrix:');
      expect(workflow).toContain('platform: [android, ios]');
      expect(workflow).toContain('environment: [development, production]');
    });

    it('should include failure notifications', () => {
      const workflow = generateGitHubWorkflow();
      
      expect(workflow).toContain('if: failure()');
      expect(workflow).toContain('Metro Build Pipeline Failed');
    });
  });

  describe('generateGitLabWorkflow', () => {
    it('should generate valid GitLab CI configuration', () => {
      const workflow = generateGitLabWorkflow();
      
      expect(workflow).toBeDefined();
      expect(typeof workflow).toBe('string');
      expect(workflow).toContain('stages:');
      expect(workflow).toContain('- build');
      expect(workflow).toContain('variables:');
      expect(workflow).toContain('NODE_VERSION');
    });

    it('should include all required GitLab CI components', () => {
      const workflow = generateGitLabWorkflow();
      
      expect(workflow).toContain('.metro_build:');
      expect(workflow).toContain('image: node');
      expect(workflow).toContain('before_script:');
      expect(workflow).toContain('npm ci');
      expect(workflow).toContain('script:');
    });

    it('should define platform and environment combinations', () => {
      const workflow = generateGitLabWorkflow();
      
      expect(workflow).toContain('metro:android:dev:');
      expect(workflow).toContain('metro:android:prod:');
      expect(workflow).toContain('metro:ios:dev:');
      expect(workflow).toContain('metro:ios:prod:');
      expect(workflow).toContain('PLATFORM: \"android\"');
      expect(workflow).toContain('ENVIRONMENT: \"development\"');
    });

    it('should include artifacts configuration', () => {
      const workflow = generateGitLabWorkflow();
      
      expect(workflow).toContain('artifacts:');
      expect(workflow).toContain('reports:');
      expect(workflow).toContain('paths:');
      expect(workflow).toContain('expire_in: 30 days');
    });

    it('should use template inheritance correctly', () => {
      const workflow = generateGitLabWorkflow();
      
      expect(workflow).toContain('<<: *metro_build');
      expect(workflow).toContain('stage: build');
    });
  });

  describe('generateJenkinsfile', () => {
    it('should generate valid Jenkins pipeline', () => {
      const workflow = generateJenkinsfile();
      
      expect(workflow).toBeDefined();
      expect(typeof workflow).toBe('string');
      expect(workflow).toContain('pipeline {');
      expect(workflow).toContain('agent any');
      expect(workflow).toContain('stages {');
      expect(workflow).toContain('post {');
    });

    it('should include parameter definitions', () => {
      const workflow = generateJenkinsfile();
      
      expect(workflow).toContain('parameters {');
      expect(workflow).toContain('choice(');
      expect(workflow).toContain('name: \'PLATFORM\'');
      expect(workflow).toContain('name: \'ENVIRONMENT\'');
      expect(workflow).toContain('choices: [\'android\', \'ios\', \'both\']');
      expect(workflow).toContain('choices: [\'development\', \'production\', \'both\']');
    });

    it('should include environment configuration', () => {
      const workflow = generateJenkinsfile();
      
      expect(workflow).toContain('environment {');
      expect(workflow).toContain('NODE_VERSION = \'18\'');
      expect(workflow).toContain('BUILD_TIMEOUT = \'30\'');
    });

    it('should define all required stages', () => {
      const workflow = generateJenkinsfile();
      
      expect(workflow).toContain('stage(\'Setup\')');
      expect(workflow).toContain('stage(\'Install Dependencies\')');
      expect(workflow).toContain('stage(\'Metro Build Pipeline\')');
    });

    it('should include setup and dependency installation', () => {
      const workflow = generateJenkinsfile();
      
      expect(workflow).toContain('def nodeHome = tool');
      expect(workflow).toContain('node --version');
      expect(workflow).toContain('npm --version');
      expect(workflow).toContain('npm ci');
      expect(workflow).toContain('npx expo install');
    });

    it('should handle platform/environment combinations', () => {
      const workflow = generateJenkinsfile();
      
      expect(workflow).toContain('def platforms = params.PLATFORM == \'both\'');
      expect(workflow).toContain('def environments = params.ENVIRONMENT == \'both\'');
      expect(workflow).toContain('for (platform in platforms)');
      expect(workflow).toContain('for (environment in environments)');
    });

    it('should include post-build actions', () => {
      const workflow = generateJenkinsfile();
      
      expect(workflow).toContain('always {');
      expect(workflow).toContain('failure {');
      expect(workflow).toContain('archiveArtifacts');
      expect(workflow).toContain('publishHTML');
      expect(workflow).toContain('emailext');
    });

    it('should include timeout configuration', () => {
      const workflow = generateJenkinsfile();
      
      expect(workflow).toContain('timeout(time: env.BUILD_TIMEOUT, unit: \'MINUTES\')');
    });

    it('should execute Metro Build Pipeline correctly', () => {
      const workflow = generateJenkinsfile();
      
      expect(workflow).toContain('npx ts-node -e');
      expect(workflow).toContain('MetroBuildPipeline.getInstance()');
      expect(workflow).toContain('await pipeline.initialize()');
      expect(workflow).toContain('await pipeline.executeBuild(');
    });
  });

  describe('Template Quality', () => {
    it('should generate templates with consistent formatting', () => {
      const github = generateGitHubWorkflow();
      const gitlab = generateGitLabWorkflow();
      const jenkins = generateJenkinsfile();

      // Check for proper YAML/Groovy formatting
      expect(github.split('\\n').every(line => !line.includes('\\t'))).toBe(true); // No tabs in YAML
      expect(gitlab.split('\\n').every(line => !line.includes('\\t'))).toBe(true); // No tabs in YAML
      
      // Jenkins uses Groovy, so we check for basic structure
      expect(jenkins).toContain('pipeline {');
      expect(jenkins).toContain('}');
    });

    it('should have appropriate indentation', () => {
      const github = generateGitHubWorkflow();
      const gitlab = generateGitLabWorkflow();
      
      // Check for proper YAML indentation (2 spaces)
      const githubLines = github.split('\\n');
      const gitlabLines = gitlab.split('\\n');
      
      // Basic structure checks
      expect(githubLines.some(line => line.startsWith('  '))).toBe(true); // 2-space indents
      expect(gitlabLines.some(line => line.startsWith('  '))).toBe(true); // 2-space indents
    });

    it('should include proper error handling', () => {
      const templates = [
        generateGitHubWorkflow(),
        generateGitLabWorkflow(),
        generateJenkinsfile(),
      ];

      templates.forEach(template => {
        // Each template should have some form of error handling or failure reporting
        expect(
          template.includes('failure') || 
          template.includes('failed') || 
          template.includes('error')
        ).toBe(true);
      });
    });

    it('should use consistent naming conventions', () => {
      const github = generateGitHubWorkflow();
      const gitlab = generateGitLabWorkflow();
      const jenkins = generateJenkinsfile();

      // All should reference Metro Build Pipeline
      expect(github).toContain('Metro Build Pipeline');
      expect(gitlab).toContain('metro_build');
      expect(jenkins).toContain('Metro Build Pipeline');

      // All should use similar platform/environment naming
      ['android', 'ios', 'development', 'production'].forEach(term => {
        expect(github).toContain(term);
        expect(gitlab).toContain(term);
        expect(jenkins).toContain(term);
      });
    });
  });

  describe('Template Integration', () => {
    it('should generate templates that work with MetroBuildPipeline', () => {
      const templates = [
        generateGitHubWorkflow(),
        generateGitLabWorkflow(),
        generateJenkinsfile(),
      ];

      templates.forEach(template => {
        expect(template).toContain('MetroBuildPipeline');
        expect(template).toContain('initialize()');
        expect(template).toContain('executeBuild(');
      });
    });

    it('should include necessary build artifacts', () => {
      const templates = [
        generateGitHubWorkflow(),
        generateGitLabWorkflow(),
        generateJenkinsfile(),
      ];

      const requiredArtifacts = ['dist', 'build-reports', 'metro-analysis-results'];
      
      templates.forEach(template => {
        requiredArtifacts.forEach(artifact => {
          expect(template).toContain(artifact);
        });
      });
    });

    it('should support all platform and environment combinations', () => {
      const templates = [
        generateGitHubWorkflow(),
        generateGitLabWorkflow(),
        generateJenkinsfile(),
      ];

      const platforms = ['android', 'ios'];
      const environments = ['development', 'production'];
      
      templates.forEach(template => {
        platforms.forEach(platform => {
          expect(template).toContain(platform);
        });
        environments.forEach(env => {
          expect(template).toContain(env);
        });
      });
    });
  });
});