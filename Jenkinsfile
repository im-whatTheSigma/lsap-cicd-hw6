pipeline {
    agent any
    
    environment {
        DISCORD_WEBHOOK = credentials('discord-webhook-url')
        DOCKER_CREDENTIALS = credentials('dockerhub-credentials')
        DOCKER_IMAGE = 'whatjerrytsai/cicd-lab-app'
        STUDENT_NAME = 'Jerry Tsai'
        STUDENT_ID = 'b13705023'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                script {
                    if (fileExists('package.json')) {
                        sh 'npm install'
                    }
                }
            }
        }
        
        stage('Static Analysis') {
            steps {
                script {
                    echo "Running ESLint on branch: ${env.BRANCH_NAME}"
                    sh 'npm run lint'
                }
            }
        }
        
        stage('Unit Tests') {
            steps {
                script {
                    echo "Running unit tests..."
                    sh 'npm test || true'
                }
            }
        }
        
        stage('Build & Deploy to Staging') {
            when {
                branch 'dev'
            }
            steps {
                script {
                    echo "Building and deploying to staging environment..."
                    
                    // BONUS: Read version from package.json dynamically
                    def packageJson = readJSON file: 'package.json'
                    def appVersion = packageJson.version
                    echo "📦 Application version from package.json: ${appVersion}"
                    
                    // Define image tags
                    def buildTag = "dev-${env.BUILD_NUMBER}"
                    def versionTag = "v${appVersion}"
                    def fullImageNameBuild = "${env.DOCKER_IMAGE}:${buildTag}"
                    def fullImageNameVersion = "${env.DOCKER_IMAGE}:${versionTag}"
                    
                    // Login to Docker Hub
                    sh """
                        echo ${DOCKER_CREDENTIALS_PSW} | docker login -u ${DOCKER_CREDENTIALS_USR} --password-stdin
                    """
                    
                    // Build Docker image with build number tag
                    sh """
                        docker build -t ${fullImageNameBuild} .
                    """
                    
                    // Tag with version from package.json
                    sh """
                        docker tag ${fullImageNameBuild} ${fullImageNameVersion}
                    """
                    
                    // Push both tags to Docker Hub
                    sh """
                        docker push ${fullImageNameBuild}
                        docker push ${fullImageNameVersion}
                    """
                    
                    echo "✅ Pushed tags:"
                    echo "   - ${buildTag} (build-based)"
                    echo "   - ${versionTag} (version-based)"
                    
                    // Cleanup: Remove existing dev-app container if exists
                    sh """
                        docker rm -f dev-app || true
                    """
                    
                    // Deploy: Run container on port 8081 using build tag
                    sh """
                        docker run -d \
                            --name dev-app \
                            -p 8081:3000 \
                            --restart unless-stopped \
                            ${fullImageNameBuild}
                    """
                    
                    // Wait for container to be ready
                    sleep(time: 5, unit: 'SECONDS')
                    
                    // Verify: Health check
                    sh """
                        curl -f http://localhost:8081/health || exit 1
                    """
                    
                    echo "✅ Staging deployment successful!"
                    echo "🐳 Images pushed:"
                    echo "   - ${fullImageNameBuild}"
                    echo "   - ${fullImageNameVersion}"
                    echo "🌐 Staging URL: http://localhost:8081"
                    echo "📝 To promote to production, update deploy.config with: ${buildTag}"
                }
            }
        }
        
        stage('GitOps Production Deployment') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "🚀 Starting GitOps-based Production Deployment..."
                    
                    // Step 1: Read Configuration
                    if (!fileExists('deploy.config')) {
                        error("❌ deploy.config file not found! Create it with the desired tag version.")
                    }
                    
                    def TARGET_TAG = readFile('deploy.config').trim()
                    echo "📋 Target tag from deploy.config: ${TARGET_TAG}"
                    
                    if (TARGET_TAG.isEmpty()) {
                        error("❌ deploy.config is empty! Specify a tag like 'dev-5'")
                    }
                    
                    // Validate tag format (accepts both dev-X and vX.X.X)
                    if (!TARGET_TAG.startsWith('dev-') && !TARGET_TAG.startsWith('v')) {
                        error("❌ Invalid tag format in deploy.config. Expected format: dev-<number> or v<semantic-version>")
                    }
                    
                    // Define image names
                    def stagingImage = "${env.DOCKER_IMAGE}:${TARGET_TAG}"
                    def prodTag = "prod-${env.BUILD_NUMBER}"
                    def prodImage = "${env.DOCKER_IMAGE}:${prodTag}"
                    
                    echo "📦 Staging image: ${stagingImage}"
                    echo "🏭 Production image: ${prodImage}"
                    
                    // Login to Docker Hub
                    sh """
                        echo ${DOCKER_CREDENTIALS_PSW} | docker login -u ${DOCKER_CREDENTIALS_USR} --password-stdin
                    """
                    
                    // Step 2: Artifact Promotion
                    echo "⬇️ Pulling staging image..."
                    sh """
                        docker pull ${stagingImage}
                    """
                    
                    echo "🏷️ Retagging as production..."
                    sh """
                        docker tag ${stagingImage} ${prodImage}
                    """
                    
                    echo "⬆️ Pushing production image..."
                    sh """
                        docker push ${prodImage}
                    """
                    
                    // Step 3: Deploy to Production
                    echo "🧹 Cleaning up old production container..."
                    sh """
                        docker rm -f prod-app || true
                    """
                    
                    echo "🚀 Deploying to production (port 8082)..."
                    sh """
                        docker run -d \
                            --name prod-app \
                            -p 8082:3000 \
                            --restart unless-stopped \
                            -e NODE_ENV=production \
                            ${prodImage}
                    """
                    
                    // Wait for container to be ready
                    sleep(time: 5, unit: 'SECONDS')
                    
                    // Verify: Health check
                    echo "🏥 Verifying production deployment..."
                    sh """
                        curl -f http://localhost:8082/health || exit 1
                    """
                    
                    echo "✅ Production deployment successful!"
                    echo "🐳 Promoted: ${stagingImage} → ${prodImage}"
                    echo "🌐 Production URL: http://localhost:8082"
                    echo "📝 Deployed tag: ${TARGET_TAG}"
                }
            }
        }
    }
    
    post {
        failure {
            script {
                sendDiscordNotification('FAILURE')
            }
        }
        success {
            script {
                if (env.BRANCH_NAME == 'dev') {
                    def packageJson = readJSON file: 'package.json'
                    def appVersion = packageJson.version
                    sendDiscordNotification('SUCCESS', "Deployed to Staging (dev-${env.BUILD_NUMBER} / v${appVersion})")
                } else if (env.BRANCH_NAME == 'main') {
                    def targetTag = fileExists('deploy.config') ? readFile('deploy.config').trim() : 'unknown'
                    sendDiscordNotification('SUCCESS', "Deployed to Production (${targetTag} → prod-${env.BUILD_NUMBER})")
                } else {
                    sendDiscordNotification('SUCCESS')
                }
            }
        }
        always {
            script {
                // Logout from Docker Hub
                sh 'docker logout || true'
            }
        }
    }
}

def sendDiscordNotification(String buildStatus, String extraInfo = '') {
    def color = buildStatus == 'SUCCESS' ? 3066993 : 15158332
    def emoji = buildStatus == 'SUCCESS' ? '✅' : '❌'
    def description = extraInfo ? " - ${extraInfo}" : ""
    
    def payload = """
    {
        "embeds": [{
            "title": "${emoji} Build ${buildStatus}${description}",
            "color": ${color},
            "fields": [
                {
                    "name": "Student Name",
                    "value": "${env.STUDENT_NAME}",
                    "inline": true
                },
                {
                    "name": "Student ID",
                    "value": "${env.STUDENT_ID}",
                    "inline": true
                },
                {
                    "name": "Job Name",
                    "value": "${env.JOB_NAME}",
                    "inline": false
                },
                {
                    "name": "Build Number",
                    "value": "#${env.BUILD_NUMBER}",
                    "inline": true
                },
                {
                    "name": "Branch",
                    "value": "${env.BRANCH_NAME}",
                    "inline": true
                },
                {
                    "name": "Status",
                    "value": "${currentBuild.currentResult}",
                    "inline": true
                },
                {
                    "name": "Repository",
                    "value": "${env.GIT_URL}",
                    "inline": false
                },
                {
                    "name": "Build URL",
                    "value": "${env.BUILD_URL}",
                    "inline": false
                }
            ],
            "timestamp": "${new Date().format("yyyy-MM-dd'T'HH:mm:ss'Z'")}"
        }]
    }
    """
    
    sh """
        curl -H "Content-Type: application/json" \
             -d '${payload}' \
             ${env.DISCORD_WEBHOOK}
    """
}
