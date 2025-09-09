pipeline {
    agent any
    tools {
        nodejs 'NodeJS' // Cần cấu hình NodeJS trong Jenkins Global Tool Configuration
    }
    environment {
        BRANCH_DEPLOY = 'deploy'
        PRODUCTION_HOST = "172.236.138.143" // Thay đổi thành host máy ảo của bạn
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
                withCredentials([file(credentialsId: 'asset-env-be', variable: 'ENV_FILE')]) {
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

        // stage('Run Tests') {
        //     steps {
        //         script {
        //             try {
        //                 sh 'pnpm run test'
        //             } catch (Exception e) {
        //                 echo "Tests failed, but continuing with deployment"
        //             }
        //         }
        //     }
        // }

        stage('Build Docker Image') {
            steps {
                script {
                    sh "docker build -f Dockerfile.prod -t ${DOCKER_HUB_REPO}/${APP_NAME}:${env.BUILD_NUMBER} ."
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
                withCredentials([usernamePassword(credentialsId: 'ssh-asset', usernameVariable: 'SERVER_USER', passwordVariable: 'SERVER_PASSWORD')]) {
                    script {
                        def deployDir = "/home/${SERVER_USER}/asset-management"
                        
                        // Alternative: Use SSH with key-based authentication (recommended)
                        // withCredentials([sshUserPrivateKey(credentialsId: 'production-server-ssh-key', keyFileVariable: 'SSH_KEY', usernameVariable: 'SERVER_USER')]) {
                        
                        // Sử dụng sshpass để kết nối với username/password
                        sh """
                            # Cài đặt sshpass nếu chưa có (với sudo)
                            if ! which sshpass > /dev/null 2>&1; then
                                sudo apt-get update && sudo apt-get install -y sshpass
                            fi
                            
                            # Copy file .env lên server
                            sshpass -p '${SERVER_PASSWORD}' scp -o StrictHostKeyChecking=no .env ${SERVER_USER}@${PRODUCTION_HOST}:${deployDir}/.env || true
                            
                            # Copy docker-compose.prod.yml lên server
                            sshpass -p '${SERVER_PASSWORD}' scp -o StrictHostKeyChecking=no docker-compose.prod.yml ${SERVER_USER}@${PRODUCTION_HOST}:${deployDir}/docker-compose.yml || true
                        """

                        // SSH vào server để deploy
                        sh """
                            sshpass -p '${SERVER_PASSWORD}' ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${PRODUCTION_HOST} << 'EOF'
                            set -e

                            # Tạo thư mục deploy nếu chưa có
                            mkdir -p ${deployDir}
                            cd ${deployDir}

                            # Login Docker Hub
                            echo "${DOCKER_PASSWORD}" | docker login --username "${DOCKER_USERNAME}" --password-stdin

                            # Stop và remove containers cũ
                            docker-compose down || true

                            # Pull image mới
                            docker pull ${DOCKER_HUB_REPO}/${APP_NAME}:${env.BUILD_NUMBER}

                            # Update docker-compose để sử dụng image mới
                            sed -i "s|image: ${DOCKER_HUB_REPO}/${APP_NAME}:.*|image: ${DOCKER_HUB_REPO}/${APP_NAME}:${env.BUILD_NUMBER}|g" docker-compose.yml

                            # Start services
                            docker-compose up -d

                            # Wait for application to be ready
                            echo "Waiting for application to start..."
                            for i in \$(seq 1 30); do
                                if curl -f http://localhost:3000/health 2>/dev/null; then
                                    echo "Application is ready!"
                                    break
                                fi
                                echo "Waiting... (\$i/30)"
                                sleep 10
                            done

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
            echo "✅ Deployment successful! Application is running at http://${PRODUCTION_HOST}:3000"
        }
        failure {
            echo "❌ Deployment failed! Please check the logs."
        }
    }
} 