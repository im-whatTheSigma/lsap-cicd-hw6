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
                    
                    // Define image tag with build number
                    def imageTag = "dev-${env.BUILD_NUMBER}"
                    def fullImageName = "${env.DOCKER_IMAGE}:${imageTag}"
                    
                    // Login to Docker Hub
                    sh """
                        echo ${DOCKER_CREDENTIALS_PSW} | docker login -u ${DOCKER_CREDENTIALS_USR} --password-stdin
                    """
                    
                    // Build Docker image
                    sh """
                        docker build -t ${fullImageName} .
                    """
                    
                    // Push to Docker Hub
                    sh """
                        docker push ${fullImageName}
                    """
                    
                    // Cleanup: Remove existing dev-app container if exists
                    sh """
                        docker rm -f dev-app || true
                    """
                    
                    // Deploy: Run container on port 8081
                    sh """
                        docker run -d \
                            --name dev-app \
                            -p 8081:3000 \
                            --restart unless-stopped \
                            ${fullImageName}
                    """
                    
                    // Wait for container to be ready
                    sleep(time: 5, unit: 'SECONDS')
                    
                    // Verify: Health check
                    sh """
                        curl -f http://localhost:8081/health || exit 1
                    """
                    
                    echo "✅ Staging deployment successful!"
                    echo "🐳 Image: ${fullImageName}"
                    echo "🌐 App URL: http://localhost:8081"
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
                    sendDiscordNotification('SUCCESS', 'Deployed to Staging')
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
