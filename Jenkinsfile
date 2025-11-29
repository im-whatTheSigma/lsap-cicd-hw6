pipeline {
    agent any
    
    environment {
        DISCORD_WEBHOOK = credentials('discord-webhook-url')
        STUDENT_NAME = 'Your Name'
        STUDENT_ID = 'Your Student ID'
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
        
        stage('Build') {
            steps {
                echo "Building application..."
                // Add your build commands here
            }
        }
        
        stage('Test') {
            steps {
                echo "Running tests..."
                // Add your test commands here
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
                sendDiscordNotification('SUCCESS')
            }
        }
    }
}

def sendDiscordNotification(String buildStatus) {
    def color = buildStatus == 'SUCCESS' ? 3066993 : 15158332
    def emoji = buildStatus == 'SUCCESS' ? '✅' : '❌'
    
    def payload = """
    {
        "embeds": [{
            "title": "${emoji} Build ${buildStatus}",
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
