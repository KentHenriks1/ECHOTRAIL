/**
 * CI/CD workflow templates for Metro Build Pipeline
 */

/**
 * Generate GitHub Actions workflow configuration
 * 
 * Creates a comprehensive GitHub Actions workflow that runs Metro build pipeline
 * across multiple platform and environment combinations. Includes proper artifact
 * handling, caching, and notification setup.
 * 
 * @returns Complete GitHub Actions YAML configuration as string
 * 
 * @example
 * ```typescript
 * const workflow = generateGitHubWorkflow();
 * await fs.writeFile('.github/workflows/metro-build.yml', workflow);
 * ```
 */
export function generateGitHubWorkflow(): string {
  return `name: Metro Build Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *'

jobs:
  metro-build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        platform: [android, ios]
        environment: [development, production]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Setup Expo
      uses: expo/expo-github-action@v8
      with:
        expo-version: latest
        token: \${{ secrets.EXPO_TOKEN }}
    
    - name: Run Metro Build Pipeline
      run: |
        npx ts-node -e "
        import { MetroBuildPipeline } from './src/core/automation/MetroBuildPipeline';
        const pipeline = MetroBuildPipeline.getInstance();
        await pipeline.initialize();
        await pipeline.executeBuild({
          platforms: ['\${{ matrix.platform }}'],
          environments: ['\${{ matrix.environment }}'],
          branch: '\${{ github.ref_name }}',
          commit: '\${{ github.sha }}'
        });
        "
    
    - name: Upload Build Artifacts
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: metro-build-\${{ matrix.platform }}-\${{ matrix.environment }}
        path: |
          dist/
          build-reports/
          metro-analysis-results/
        retention-days: 30
`;
}

/**
 * Generate GitLab CI configuration
 * 
 * Creates a GitLab CI/CD configuration that executes Metro build pipeline
 * with proper stage definitions, artifact management, and build matrices.
 * Uses YAML anchors and references for DRY configuration.
 * 
 * @returns Complete GitLab CI YAML configuration as string
 * 
 * @example
 * ```typescript
 * const config = generateGitLabWorkflow();
 * await fs.writeFile('.gitlab-ci.yml', config);
 * ```
 */
export function generateGitLabWorkflow(): string {
  return `stages:
  - build
  - analyze
  - deploy

variables:
  NODE_VERSION: "18"

.metro_build_template: &metro_build
  image: node:\${NODE_VERSION}
  cache:
    paths:
      - node_modules/
  before_script:
    - npm ci
    - npx expo install
  script:
    - npx ts-node -e "
      import { MetroBuildPipeline } from './src/core/automation/MetroBuildPipeline';
      const pipeline = MetroBuildPipeline.getInstance();
      await pipeline.initialize();
      await pipeline.executeBuild({
        platforms: ['\${PLATFORM}'],
        environments: ['\${ENVIRONMENT}'],
        branch: '\${CI_COMMIT_REF_NAME}',
        commit: '\${CI_COMMIT_SHA}'
      });
      "
  artifacts:
    reports:
      junit: build-reports/*.xml
    paths:
      - dist/
      - build-reports/
      - metro-analysis-results/
    expire_in: 30 days

metro:android:dev:
  <<: *metro_build
  stage: build
  variables:
    PLATFORM: "android"
    ENVIRONMENT: "development"

metro:android:prod:
  <<: *metro_build
  stage: build
  variables:
    PLATFORM: "android"
    ENVIRONMENT: "production"

metro:ios:dev:
  <<: *metro_build
  stage: build
  variables:
    PLATFORM: "ios"
    ENVIRONMENT: "development"

metro:ios:prod:
  <<: *metro_build
  stage: build
  variables:
    PLATFORM: "ios"
    ENVIRONMENT: "production"
`;
}

/**
 * Generate Jenkins pipeline stages
 */
function generateJenkinsStages(): string {
  return `    stages {
        stage('Setup') {
            steps {
                script {
                    def nodeHome = tool "nodejs-\${NODE_VERSION}"
                    env.PATH = "\${nodeHome}/bin:\${env.PATH}"
                }
                sh 'node --version'
                sh 'npm --version'
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
                sh 'npx expo install'
            }
        }
        
        stage('Metro Build Pipeline') {
            steps {
                timeout(time: env.BUILD_TIMEOUT, unit: 'MINUTES') {
                    script {
                        def platforms = params.PLATFORM == 'both' ? ['android', 'ios'] : [params.PLATFORM]
                        def environments = params.ENVIRONMENT == 'both' ? ['development', 'production'] : [params.ENVIRONMENT]
                        
                        for (platform in platforms) {
                            for (environment in environments) {
                                sh """
                                npx ts-node -e "
                                import { MetroBuildPipeline } from './src/core/automation/MetroBuildPipeline';
                                const pipeline = MetroBuildPipeline.getInstance();
                                await pipeline.initialize();
                                await pipeline.executeBuild({
                                  platforms: ['\${platform}'],
                                  environments: ['\${environment}'],
                                  branch: '\${env.BRANCH_NAME}',
                                  commit: '\${env.GIT_COMMIT}'
                                });
                                "
                                """
                            }
                        }
                    }
                }
            }
        }
    }`;
}

/**
 * Generate Jenkins post-build actions
 */
function generateJenkinsPost(): string {
  return `    post {
        always {
            archiveArtifacts artifacts: 'dist/**, build-reports/**, metro-analysis-results/**', allowEmptyArchive: true
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'build-reports',
                reportFiles: '*.html',
                reportName: 'Metro Build Report'
            ])
        }
        failure {
            emailext (
                subject: "Metro Build Pipeline Failed: \${env.JOB_NAME} - \${env.BUILD_NUMBER}",
                body: """
                Metro build pipeline failed for:
                Project: \${env.JOB_NAME}
                Build: \${env.BUILD_NUMBER}
                Platform: \${params.PLATFORM}
                Environment: \${params.ENVIRONMENT}
                
                Check the build logs for details.
                """,
                to: "\${env.DEFAULT_RECIPIENTS}"
            )
        }
    }`;
}

/**
 * Generate Jenkins pipeline configuration
 * 
 * Creates a Jenkins pipeline script that orchestrates Metro build pipeline
 * execution with parameterized builds, proper error handling, and artifact
 * archival. Supports both single and matrix build configurations.
 * 
 * @returns Complete Jenkins pipeline script as string
 * 
 * @example
 * ```typescript
 * const pipeline = generateJenkinsfile();
 * await fs.writeFile('Jenkinsfile', pipeline);
 * ```
 */
export function generateJenkinsfile(): string {
  return `pipeline {
    agent any
    
    parameters {
        choice(
            name: 'PLATFORM',
            choices: ['android', 'ios', 'both'],
            description: 'Platform to build'
        )
        choice(
            name: 'ENVIRONMENT',
            choices: ['development', 'production', 'both'],
            description: 'Environment to build'
        )
    }
    
    environment {
        NODE_VERSION = '18'
        BUILD_TIMEOUT = '30'
    }
    
${generateJenkinsStages()}
    
${generateJenkinsPost()}
}`;
}
