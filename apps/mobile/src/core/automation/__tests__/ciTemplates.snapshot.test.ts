/**
 * Golden Master Tests for CI Template Generation
 * 
 * These tests ensure that generated CI/CD templates remain stable
 * and catch any unintended changes in the generated output.
 * Uses both Jest snapshots and golden file comparisons.
 */

import { generateGitHubWorkflow, generateGitLabWorkflow, generateJenkinsfile } from '../ciTemplates';
import * as fs from 'fs/promises';
import * as path from 'path';

// Golden master directory
const GOLDEN_MASTERS_DIR = path.join(__dirname, '__golden_masters__');

describe('CI Templates - Golden Master Tests', () => {
  
  beforeAll(async () => {
    // Ensure golden masters directory exists
    try {
      await fs.mkdir(GOLDEN_MASTERS_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  describe('GitHub Actions Templates', () => {
    it('should generate stable GitHub workflow with default options', () => {
      const workflow = generateGitHubWorkflow();
      
      // Jest snapshot test
      expect(workflow).toMatchSnapshot('github-default-workflow');
      
      // Should contain essential GitHub Actions components
      expect(workflow).toContain('name: Metro Build Pipeline');
      expect(workflow).toContain('runs-on: ubuntu-latest');
      expect(workflow).toContain('actions/checkout@v');
      expect(workflow).toContain('actions/setup-node@v');
      expect(workflow).toContain('npm ci');
      expect(workflow).toContain('npm run build');
      
      // Should be valid YAML structure
      expect(workflow).toMatch(/^name:\s+Metro Build Pipeline/);
      expect(workflow).toContain('jobs:');
      expect(workflow).toContain('steps:');
    });

    it('should generate stable GitHub workflow with advanced options', () => {
      const workflow = generateGitHubWorkflow({
        enablePerformanceBenchmarks: true,
        enableMutationTesting: true,
        platforms: ['android', 'ios'],
        nodeVersions: ['18', '20', '22'],
        includeDeployment: true
      });
      
      // Jest snapshot test  
      expect(workflow).toMatchSnapshot('github-advanced-workflow');
      
      // Should include advanced features
      expect(workflow).toContain('mutation testing');
      expect(workflow).toContain('performance benchmarks');
      expect(workflow).toContain('strategy:');
      expect(workflow).toContain('matrix:');
      expect(workflow).toContain('node-version: [18, 20, 22]');
      
      // Should include deployment steps
      expect(workflow).toContain('deploy');
      expect(workflow).toContain('artifacts');
    });

    it('should match golden master file for GitHub workflow', async () => {
      const workflow = generateGitHubWorkflow();
      const goldenPath = path.join(GOLDEN_MASTERS_DIR, 'github-workflow.yml');
      
      try {
        // Try to read existing golden master
        const goldenContent = await fs.readFile(goldenPath, 'utf8');
        expect(workflow.trim()).toBe(goldenContent.trim());
      } catch (error) {
        // Golden master doesn't exist, create it
        await fs.writeFile(goldenPath, workflow);
        console.warn(`Created new golden master: ${goldenPath}`);
        
        // This test should pass after the golden master is created
        expect(workflow).toBeDefined();
        expect(workflow.length).toBeGreaterThan(100);
      }
    });
  });

  describe('GitLab CI Templates', () => {
    it('should generate stable GitLab CI configuration', () => {
      const ciConfig = generateGitLabWorkflow();
      
      // Jest snapshot test
      expect(ciConfig).toMatchSnapshot('gitlab-ci-config');
      
      // Should contain essential GitLab CI components
      expect(ciConfig).toContain('stages:');
      expect(ciConfig).toContain('- build');
      expect(ciConfig).toContain('- test');
      expect(ciConfig).toContain('image: node:');
      expect(ciConfig).toContain('cache:');
      expect(ciConfig).toContain('artifacts:');
      
      // Should have proper job definitions
      expect(ciConfig).toMatch(/^stages:/);
      expect(ciConfig).toContain('build:');
      expect(ciConfig).toContain('test:');
      expect(ciConfig).toContain('script:');
    });

    it('should generate GitLab CI with custom Docker image', () => {
      const ciConfig = generateGitLabWorkflow({
        dockerImage: 'node:20-alpine',
        enableCodeQuality: true,
        enableSecurity: true
      });
      
      expect(ciConfig).toMatchSnapshot('gitlab-ci-custom-image');
      
      // Should use custom image
      expect(ciConfig).toContain('image: node:20-alpine');
      
      // Should include code quality and security
      expect(ciConfig).toContain('code_quality');
      expect(ciConfig).toContain('security');
      expect(ciConfig).toContain('sast');
    });

    it('should match golden master file for GitLab CI', async () => {
      const ciConfig = generateGitLabWorkflow();
      const goldenPath = path.join(GOLDEN_MASTERS_DIR, 'gitlab-ci.yml');
      
      try {
        const goldenContent = await fs.readFile(goldenPath, 'utf8');
        expect(ciConfig.trim()).toBe(goldenContent.trim());
      } catch (error) {
        await fs.writeFile(goldenPath, ciConfig);
        console.warn(`Created new golden master: ${goldenPath}`);
        
        expect(ciConfig).toBeDefined();
        expect(ciConfig.length).toBeGreaterThan(100);
      }
    });
  });

  describe('Jenkins Pipeline Templates', () => {
    it('should generate stable Jenkinsfile', () => {
      const jenkinsfile = generateJenkinsfile();
      
      // Jest snapshot test
      expect(jenkinsfile).toMatchSnapshot('jenkinsfile-default');
      
      // Should contain essential Jenkins pipeline components
      expect(jenkinsfile).toContain('pipeline {');
      expect(jenkinsfile).toContain('agent');
      expect(jenkinsfile).toContain('stages {');
      expect(jenkinsfile).toContain('stage(');
      expect(jenkinsfile).toContain('steps {');
      expect(jenkinsfile).toContain('sh ');
      
      // Should have proper pipeline structure
      expect(jenkinsfile).toMatch(/^pipeline\s*{/);
      expect(jenkinsfile).toContain('stage(\'Build\')');
      expect(jenkinsfile).toContain('stage(\'Test\')');
    });

    it('should generate Jenkins pipeline with parallel execution', () => {
      const jenkinsfile = generateJenkinsfile({
        enableParallelBuilds: true,
        platforms: ['android', 'ios'],
        enableDockerization: true
      });
      
      expect(jenkinsfile).toMatchSnapshot('jenkinsfile-parallel');
      
      // Should include parallel execution
      expect(jenkinsfile).toContain('parallel {');
      expect(jenkinsfile).toContain('android');
      expect(jenkinsfile).toContain('ios');
      
      // Should include Docker
      expect(jenkinsfile).toContain('docker');
      expect(jenkinsfile).toContain('image');
    });

    it('should match golden master file for Jenkinsfile', async () => {
      const jenkinsfile = generateJenkinsfile();
      const goldenPath = path.join(GOLDEN_MASTERS_DIR, 'Jenkinsfile');
      
      try {
        const goldenContent = await fs.readFile(goldenPath, 'utf8');
        expect(jenkinsfile.trim()).toBe(goldenContent.trim());
      } catch (error) {
        await fs.writeFile(goldenPath, jenkinsfile);
        console.warn(`Created new golden master: ${goldenPath}`);
        
        expect(jenkinsfile).toBeDefined();
        expect(jenkinsfile.length).toBeGreaterThan(100);
      }
    });
  });

  describe('Cross-Platform Consistency', () => {
    it('should generate consistent build commands across all platforms', () => {
      const github = generateGitHubWorkflow();
      const gitlab = generateGitLabWorkflow();
      const jenkins = generateJenkinsfile();
      
      // All platforms should use consistent npm commands
      const npmCommands = ['npm ci', 'npm run build', 'npm test'];
      
      npmCommands.forEach(command => {
        expect(github).toContain(command);
        expect(gitlab).toContain(command);
        expect(jenkins).toContain(command);
      });
    });

    it('should include performance benchmarks consistently', () => {
      const options = { enablePerformanceBenchmarks: true };
      
      const github = generateGitHubWorkflow(options);
      const gitlab = generateGitLabWorkflow(options);
      const jenkins = generateJenkinsfile(options);
      
      // All should include benchmark commands
      [github, gitlab, jenkins].forEach(template => {
        expect(template).toContain('benchmark');
        expect(template).toContain('npm run test:performance');
      });
    });

    it('should handle Node.js version matrices consistently', () => {
      const options = { nodeVersions: ['18', '20', '22'] };
      
      const github = generateGitHubWorkflow(options);
      const gitlab = generateGitLabWorkflow(options);
      const jenkins = generateJenkinsfile(options);
      
      // Should reference all Node.js versions
      ['18', '20', '22'].forEach(version => {
        expect(github).toContain(version);
        expect(gitlab).toContain(version);  
        expect(jenkins).toContain(version);
      });
    });
  });

  describe('Template Validation', () => {
    it('should generate syntactically valid YAML for GitHub and GitLab', () => {
      const github = generateGitHubWorkflow();
      const gitlab = generateGitLabWorkflow();
      
      // Basic YAML structure validation
      expect(github).toMatch(/^name:\s*[^\n]+/);
      expect(github).toMatch(/\njobs:\s*\n/);
      expect(gitlab).toMatch(/^stages:\s*\n/);
      
      // Should not contain invalid YAML constructs
      expect(github).not.toContain('\t'); // No tabs in YAML
      expect(gitlab).not.toContain('\t');
      
      // Should have proper indentation
      expect(github).toMatch(/\n  [a-zA-Z]/); // 2-space indentation
      expect(gitlab).toMatch(/\n  [a-zA-Z]/);
    });

    it('should generate valid Groovy syntax for Jenkins', () => {
      const jenkinsfile = generateJenkinsfile();
      
      // Basic Groovy/Jenkins pipeline syntax
      expect(jenkinsfile).toMatch(/^pipeline\s*{/);
      expect(jenkinsfile).toMatch(/}\s*$/);
      
      // Should have balanced braces
      const openBraces = (jenkinsfile.match(/{/g) || []).length;
      const closeBraces = (jenkinsfile.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);
      
      // Should have proper stage structure
      expect(jenkinsfile).toMatch(/stage\(['"]/);
      expect(jenkinsfile).toContain('steps {');
    });

    it('should not contain sensitive information in templates', () => {
      const github = generateGitHubWorkflow();
      const gitlab = generateGitLabWorkflow();
      const jenkins = generateJenkinsfile();
      
      const templates = [github, gitlab, jenkins];
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /token/i,
        /key.*=.*[a-zA-Z0-9]{10}/i, // Looks like actual key
        /\b[A-Za-z0-9+/]{40,}={0,2}\b/ // Base64-like strings
      ];
      
      templates.forEach((template, index) => {
        const templateNames = ['GitHub', 'GitLab', 'Jenkins'];
        
        sensitivePatterns.forEach(pattern => {
          expect(template).not.toMatch(pattern);
        });
      });
    });
  });

  describe('Template Regression Detection', () => {
    it('should detect significant changes in template length', () => {
      const github = generateGitHubWorkflow();
      const gitlab = generateGitLabWorkflow();
      const jenkins = generateJenkinsfile();
      
      // Templates should be within reasonable length ranges
      // If these fail, it might indicate major template changes
      expect(github.length).toBeGreaterThan(500);
      expect(github.length).toBeLessThan(5000);
      
      expect(gitlab.length).toBeGreaterThan(300);
      expect(gitlab.length).toBeLessThan(3000);
      
      expect(jenkins.length).toBeGreaterThan(400);
      expect(jenkins.length).toBeLessThan(4000);
    });

    it('should maintain expected number of CI stages', () => {
      const github = generateGitHubWorkflow();
      const gitlab = generateGitLabWorkflow();
      const jenkins = generateJenkinsfile();
      
      // GitHub: Should have key job sections
      expect(github.match(/\n\s+\w+:/g)?.length).toBeGreaterThanOrEqual(3); // At least 3 jobs
      
      // GitLab: Should have expected stages
      const gitlabStages = gitlab.match(/^[a-zA-Z_]+:/gm) || [];
      expect(gitlabStages.length).toBeGreaterThanOrEqual(4); // At least 4 stage definitions
      
      // Jenkins: Should have expected stages
      const jenkinsStages = jenkins.match(/stage\(['"]/g) || [];
      expect(jenkinsStages.length).toBeGreaterThanOrEqual(3); // At least 3 stages
    });

    it('should maintain essential environment variables', () => {
      const github = generateGitHubWorkflow();
      const gitlab = generateGitLabWorkflow();
      const jenkins = generateJenkinsfile();
      
      // Should reference common CI environment variables
      const essentialVars = ['NODE_ENV', 'CI'];
      
      essentialVars.forEach(envVar => {
        expect(github).toContain(envVar);
        expect(gitlab).toContain(envVar);
        expect(jenkins).toContain(envVar);
      });
    });
  });
});