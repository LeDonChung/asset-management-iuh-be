pipeline {
    agent any
    tools {
        nodejs 'NodeJS'
    }
    environment {
        BRANCH_DEPLOY = 'deploy'
        PRODUCTION_HOST = "34.158.42.23"
        DOCKER_HUB_REPO = 'ledonchung'
        APP_NAME = 'asset-management-iuh-be'
    }
    stages {
        stage('Checkout') {
            steps {
                git branch: env.BRANCH_DEPLOY, url: 'https://github.com/LeDonChung/asset-management-iuh-be.git'
            }
        }

        stage('Load .env') {
            steps {
                withCredentials([file(credentialsId: 'asset-management-iuh-be', variable: 'ENV_FILE')]) {
                    sh 'rm -f .env'
                    sh 'cp "$ENV_FILE" .env'
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install -g pnpm'
                sh 'pnpm install'
            }
        }

        stage('Build Application') {
            steps {
                sh 'pnpm run build'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    sh "docker build -f Dockerfile -t ${DOCKER_HUB_REPO}/${APP_NAME}:${env.BUILD_NUMBER} ."
                    sh "docker tag ${DOCKER_HUB_REPO}/${APP_NAME}:${env.BUILD_NUMBER} ${DOCKER_HUB_REPO}/${APP_NAME}:latest"
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-credentials', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                    sh 'echo $DOCKER_PASSWORD | docker login --username $DOCKER_USERNAME --password-stdin'
                    sh "docker push ${DOCKER_HUB_REPO}/${APP_NAME}:${env.BUILD_NUMBER}"
                    sh "docker push ${DOCKER_HUB_REPO}/${APP_NAME}:latest"
                }
            }
        }

        stage('Deploy to Production') {
            steps {
                withCredentials([
                    sshUserPrivateKey(credentialsId: 'production-server-ssh-key', keyFileVariable: 'KEY', usernameVariable: 'USER'),
                    usernamePassword(credentialsId: 'docker-credentials', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')
                ]) {
                    script {
                        def remoteHost = "${PRODUCTION_HOST}"
                        def deployDir = "/home/$USER/asset-management-be"
        
                        // Gửi file .env từ Jenkins sang server
                        sh """
                            scp -i $KEY -o StrictHostKeyChecking=no .env $USER@$remoteHost:${deployDir}/.env || true
                        """
                        
                        // Gửi file docker-compose.yml từ Jenkins sang server
                        sh """
                            scp -i $KEY -o StrictHostKeyChecking=no docker-compose.yml $USER@$remoteHost:${deployDir}/docker-compose.yml || true
                        """

                        // Gửi script init-db.sql nếu có
                        sh """
                            scp -i $KEY -o StrictHostKeyChecking=no -r scripts/ $USER@$remoteHost:${deployDir}/ || true
                        """
        
                        // SSH vào server để deploy
                        sh """
                            ssh -i $KEY -o StrictHostKeyChecking=no $USER@$remoteHost << 'EOF'
                            set -e

                            # Tạo thư mục deploy nếu chưa có và clone repository nếu chưa tồn tại
                            if [ ! -d "${deployDir}" ]; then
                                git clone -b ${BRANCH_DEPLOY} https://github.com/LeDonChung/asset-management-iuh-be.git ${deployDir}
                            else
                                cd ${deployDir}
                                git fetch origin
                                git checkout ${BRANCH_DEPLOY}
                            fi

                            cd ${deployDir}
        
                            # Login Docker Hub
                            echo "$DOCKER_PASSWORD" | docker login --username "$DOCKER_USERNAME" --password-stdin
        
                            # Stop và remove containers cũ
                            docker-compose -f docker-compose.yml --env-file .env down || true
        
                            # Pull image mới
                            docker pull ${DOCKER_HUB_REPO}/${APP_NAME}:${env.BUILD_NUMBER}
                            
                            # Update docker-compose để sử dụng image mới
                            sed -i "s|image: ${DOCKER_HUB_REPO}/${APP_NAME}:.*|image: ${DOCKER_HUB_REPO}/${APP_NAME}:${env.BUILD_NUMBER}|g" docker-compose.yml
        
                            # Start services (PostgreSQL, Redis, và Backend)
                            docker-compose -f docker-compose.yml --env-file .env up -d
                            
                            # Show running containers
                            docker-compose ps
        
                            # Cleanup old images
                            docker image prune -f
EOF
                        """
                    }
                }
            }
        }
    }
    post {
        always {
            sh 'docker logout'
            // Cleanup old local images
            sh """
            for image in \$(docker images --format '{{.Repository}}:{{.Tag}}' | grep '^${DOCKER_HUB_REPO}/${APP_NAME}'); do
                tag=\$(echo \$image | cut -d':' -f2)
                if [ "\$tag" != "latest" ] && echo "\$tag" | grep -E '^[0-9]+\$' > /dev/null; then
                    if [ "\$tag" -lt ${BUILD_NUMBER} ]; then
                        echo "🧹 Removing old image \$image"
                        docker rmi "\$image" || true
                    fi
                fi
            done
            """
        }
        success {
            echo "✅ Backend deployment successful! API is running at http://${PRODUCTION_HOST}:3000"
            echo "📊 Swagger documentation available at http://${PRODUCTION_HOST}:3000/api"
            echo "🗄️ Database: PostgreSQL running on port 5432"
            echo "🚀 Redis: Cache server running on port 6379"
        }
        failure {
            echo "❌ Backend deployment failed! Please check the logs."
        }
    }
}