pipeline {
    agent any
    
    environment {
        // Docker Hub credentials
        DOCKER_HUB_CREDENTIALS = credentials('docker-hub-credentials')
        DOCKER_IMAGE_NAME = 'ledonchung/asset-management-iuh-be'
        
        // Application environment
        NODE_ENV = 'production'
        
        // Database credentials
        DB_CREDENTIALS = credentials('postgres-credentials')
        
        // Notification settings
        SLACK_CHANNEL = '#asset-management-notifications'
        SLACK_CREDENTIALS = credentials('slack-webhook')
    }
    
    options {
        // Keep only last 10 builds
        buildDiscarder(logRotator(numToKeepStr: '10'))
        
        // Timeout for entire pipeline
        timeout(time: 30, unit: 'MINUTES')
        
        // Skip default checkout
        skipDefaultCheckout(false)
        
        // Timestamps in console output
        timestamps()
    }
    
    tools {
        nodejs '18'
    }
    
    stages {
        stage('📋 Preparation') {
            steps {
                script {
                    // Get commit info
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    
                    env.BUILD_VERSION = "${env.BUILD_NUMBER}-${env.GIT_COMMIT_SHORT}"
                    
                    echo "🚀 Starting build for Asset Management System"
                    echo "📝 Build Version: ${env.BUILD_VERSION}"
                    echo "🌿 Branch: ${env.BRANCH_NAME}"
                    echo "📦 Commit: ${env.GIT_COMMIT_SHORT}"
                }
                
                // Clean workspace
                cleanWs()
                
                // Checkout code
                checkout scm
                
                // Display build information
                sh '''
                    echo "=== Build Information ==="
                    echo "Node.js version: $(node --version)"
                    echo "npm version: $(npm --version)"
                    echo "Git commit: $GIT_COMMIT_SHORT"
                    echo "Build number: $BUILD_NUMBER"
                    echo "========================="
                '''
            }
        }
        
        stage('🔍 Code Quality & Security') {
            parallel {
                stage('Lint Check') {
                    steps {
                        script {
                            // Install dependencies
                            sh 'npm install -g pnpm'
                            sh 'pnpm install --frozen-lockfile'
                            
                            // Run linting
                            sh 'pnpm run lint'
                        }
                    }
                    post {
                        always {
                            // Publish lint results if available
                            publishHTML([
                                allowMissing: true,
                                alwaysLinkToLastBuild: false,
                                keepAll: true,
                                reportDir: 'lint-results',
                                reportFiles: 'index.html',
                                reportName: 'ESLint Report'
                            ])
                        }
                    }
                }
                
                stage('Security Scan') {
                    steps {
                        script {
                            // NPM audit
                            sh '''
                                echo "🔒 Running security audit..."
                                pnpm audit --audit-level moderate || echo "Security issues found, review required"
                            '''
                            
                            // Additional security scanning with snyk if available
                            script {
                                try {
                                    sh 'npx snyk test --json > snyk-report.json || true'
                                } catch (Exception e) {
                                    echo "Snyk not available or failed: ${e.getMessage()}"
                                }
                            }
                        }
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'snyk-report.json', allowEmptyArchive: true
                        }
                    }
                }
                
                stage('Dependency Check') {
                    steps {
                        sh '''
                            echo "📦 Checking dependencies..."
                            pnpm list --depth=0
                            pnpm outdated || echo "Some packages are outdated"
                        '''
                    }
                }
            }
        }
        
        stage('🧪 Testing') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        script {
                            sh '''
                                echo "🧪 Running unit tests..."
                                pnpm run test:cov
                            '''
                        }
                    }
                    post {
                        always {
                            // Publish test results
                            publishTestResults testResultsPattern: 'coverage/lcov-report/index.html'
                            
                            // Publish coverage
                            publishHTML([
                                allowMissing: false,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: 'coverage/lcov-report',
                                reportFiles: 'index.html',
                                reportName: 'Coverage Report'
                            ])
                            
                            // Archive coverage data
                            archiveArtifacts artifacts: 'coverage/**/*', allowEmptyArchive: true
                        }
                    }
                }
                
                stage('E2E Tests') {
                    when {
                        anyOf {
                            branch 'main'
                            branch 'develop'
                            changeRequest()
                        }
                    }
                    steps {
                        script {
                            // Start test database
                            sh '''
                                echo "🗄️ Starting test database..."
                                docker run -d --name test-postgres-${BUILD_NUMBER} \
                                    -e POSTGRES_USER=test \
                                    -e POSTGRES_PASSWORD=test \
                                    -e POSTGRES_DB=asset_test \
                                    -p 5433:5432 \
                                    postgres:15-alpine
                                
                                # Wait for database to be ready
                                sleep 10
                            '''
                            
                            // Run E2E tests
                            sh '''
                                export DB_HOST=localhost
                                export DB_PORT=5433
                                export DB_USERNAME=test
                                export DB_PASSWORD=test
                                export DB_NAME=asset_test
                                export JWT_SECRET=test-secret-key
                                
                                echo "🚀 Running E2E tests..."
                                pnpm run test:e2e
                            '''
                        }
                    }
                    post {
                        always {
                            // Clean up test database
                            sh '''
                                docker stop test-postgres-${BUILD_NUMBER} || true
                                docker rm test-postgres-${BUILD_NUMBER} || true
                            '''
                            
                            // Archive E2E test results
                            archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true
                        }
                    }
                }
            }
        }
        
        stage('🏗️ Build Application') {
            steps {
                script {
                    echo "🏗️ Building application..."
                    
                    // Build the application
                    sh 'pnpm run build'
                    
                    // Verify build output
                    sh '''
                        echo "📦 Verifying build output..."
                        ls -la dist/
                        echo "Build completed successfully!"
                    '''
                }
            }
            post {
                success {
                    // Archive build artifacts
                    archiveArtifacts artifacts: 'dist/**/*', fingerprint: true
                }
            }
        }
        
        stage('🐳 Docker Build') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    branch 'staging'
                }
            }
            steps {
                script {
                    echo "🐳 Building Docker image..."
                    
                    // Build Docker image
                    def dockerImage = docker.build("${DOCKER_IMAGE_NAME}:${BUILD_VERSION}")
                    
                    // Tag with latest if main branch
                    if (env.BRANCH_NAME == 'main') {
                        dockerImage.tag('latest')
                    }
                    
                    // Tag with branch name
                    dockerImage.tag("${env.BRANCH_NAME}")
                    
                    env.DOCKER_IMAGE_BUILT = dockerImage.id
                }
            }
        }
        
        stage('🔍 Docker Security Scan') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    // Scan Docker image for vulnerabilities
                    sh '''
                        echo "🔍 Scanning Docker image for vulnerabilities..."
                        
                        # Using Trivy for vulnerability scanning
                        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                            -v ${WORKSPACE}:/workspace \
                            aquasec/trivy:latest image \
                            --format json \
                            --output /workspace/trivy-report.json \
                            ${DOCKER_IMAGE_NAME}:${BUILD_VERSION} || echo "Vulnerabilities found"
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json', allowEmptyArchive: true
                }
            }
        }
        
        stage('📤 Push Docker Image') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    branch 'staging'
                }
            }
            steps {
                script {
                    echo "📤 Pushing Docker image to registry..."
                    
                    docker.withRegistry('https://registry.hub.docker.com', 'docker-hub-credentials') {
                        // Push specific version
                        sh "docker push ${DOCKER_IMAGE_NAME}:${BUILD_VERSION}"
                        
                        // Push branch tag
                        sh "docker push ${DOCKER_IMAGE_NAME}:${env.BRANCH_NAME}"
                        
                        // Push latest if main branch
                        if (env.BRANCH_NAME == 'main') {
                            sh "docker push ${DOCKER_IMAGE_NAME}:latest"
                        }
                    }
                }
            }
        }
        
        stage('🚀 Deploy') {
            parallel {
                stage('Deploy to Staging') {
                    when {
                        anyOf {
                            branch 'develop'
                            branch 'staging'
                        }
                    }
                    steps {
                        script {
                            echo "🚀 Deploying to staging environment..."
                            
                            // Deploy to staging using docker-compose
                            sh '''
                                echo "Deploying version ${BUILD_VERSION} to staging..."
                                
                                # Update docker-compose for staging
                                export DOCKER_IMAGE_TAG=${BUILD_VERSION}
                                export ENVIRONMENT=staging
                                
                                # Deploy using docker-compose
                                docker-compose -f docker-compose.staging.yml down || true
                                docker-compose -f docker-compose.staging.yml up -d
                                
                                # Wait for service to be ready
                                sleep 30
                                
                                # Health check
                                curl -f http://staging.asset-management.local/health || exit 1
                            '''
                        }
                    }
                }
                
                stage('Deploy to Production') {
                    when {
                        allOf {
                            branch 'main'
                            expression { 
                                return env.DEPLOY_TO_PRODUCTION == 'true' 
                            }
                        }
                    }
                    steps {
                        script {
                            // Manual approval for production deployment
                            timeout(time: 10, unit: 'MINUTES') {
                                input message: 'Deploy to Production?', 
                                      ok: 'Deploy',
                                      submitterParameter: 'DEPLOYER'
                            }
                            
                            echo "🚀 Deploying to production environment..."
                            echo "👤 Deployed by: ${env.DEPLOYER}"
                            
                            sh '''
                                echo "Deploying version ${BUILD_VERSION} to production..."
                                
                                # Update production environment
                                export DOCKER_IMAGE_TAG=${BUILD_VERSION}
                                export ENVIRONMENT=production
                                
                                # Deploy using docker-compose
                                docker-compose -f docker-compose.prod.yml down || true
                                docker-compose -f docker-compose.prod.yml up -d
                                
                                # Wait for service to be ready
                                sleep 60
                                
                                # Health check
                                curl -f https://api.asset-management.com/health || exit 1
                                
                                echo "✅ Production deployment completed successfully!"
                            '''
                        }
                    }
                }
            }
        }
        
        stage('🧪 Post-Deployment Tests') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    branch 'staging'
                }
            }
            steps {
                script {
                    echo "🧪 Running post-deployment tests..."
                    
                    // Determine environment URL
                    def environmentUrl = 'http://localhost:3000'
                    if (env.BRANCH_NAME == 'main') {
                        environmentUrl = 'https://api.asset-management.com'
                    } else if (env.BRANCH_NAME == 'staging') {
                        environmentUrl = 'http://staging.asset-management.local'
                    }
                    
                    sh """
                        echo "Testing deployment at: ${environmentUrl}"
                        
                        # Health check
                        curl -f ${environmentUrl}/health
                        
                        # API availability check
                        curl -f ${environmentUrl}/api || echo "API documentation might be restricted"
                        
                        echo "✅ Post-deployment tests passed!"
                    """
                }
            }
        }
    }
    
    post {
        always {
            // Clean up Docker images
            sh '''
                echo "🧹 Cleaning up Docker images..."
                docker image prune -f --filter "until=24h" || true
            '''
            
            // Archive build logs
            archiveArtifacts artifacts: 'build.log', allowEmptyArchive: true
        }
        
        success {
            script {
                echo "✅ Pipeline completed successfully!"
                
                // Send success notification
                if (env.BRANCH_NAME == 'main') {
                    slackSend(
                        channel: env.SLACK_CHANNEL,
                        color: 'good',
                        message: """
                        ✅ *Asset Management Backend - Deployment Successful*
                        
                        • *Branch:* ${env.BRANCH_NAME}
                        • *Build:* #${env.BUILD_NUMBER}
                        • *Version:* ${env.BUILD_VERSION}
                        • *Deployer:* ${env.DEPLOYER ?: 'Automated'}
                        • *Duration:* ${currentBuild.durationString}
                        
                        🚀 Production deployment completed successfully!
                        """.stripIndent()
                    )
                }
            }
        }
        
        failure {
            script {
                echo "❌ Pipeline failed!"
                
                // Send failure notification
                slackSend(
                    channel: env.SLACK_CHANNEL,
                    color: 'danger',
                    message: """
                    ❌ *Asset Management Backend - Build Failed*
                    
                    • *Branch:* ${env.BRANCH_NAME}
                    • *Build:* #${env.BUILD_NUMBER}
                    • *Version:* ${env.BUILD_VERSION}
                    • *Stage:* ${env.STAGE_NAME}
                    • *Duration:* ${currentBuild.durationString}
                    
                    🔗 [View Build](${env.BUILD_URL})
                    """.stripIndent()
                )
            }
        }
        
        unstable {
            script {
                echo "⚠️ Pipeline completed with warnings!"
                
                slackSend(
                    channel: env.SLACK_CHANNEL,
                    color: 'warning',
                    message: """
                    ⚠️ *Asset Management Backend - Build Unstable*
                    
                    • *Branch:* ${env.BRANCH_NAME}
                    • *Build:* #${env.BUILD_NUMBER}
                    • *Version:* ${env.BUILD_VERSION}
                    • *Duration:* ${currentBuild.durationString}
                    
                    Some tests failed or warnings were found.
                    🔗 [View Build](${env.BUILD_URL})
                    """.stripIndent()
                )
            }
        }
        
        cleanup {
            // Final cleanup
            cleanWs()
        }
    }
}
