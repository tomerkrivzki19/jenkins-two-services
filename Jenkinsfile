pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install API Dependencies') {
            steps {
                dir('api') {
                    sh 'npm install'
                }
            }
        }

        stage('API Tests + Coverage') {
            steps {
                dir('api') {
                    sh 'npm run test:coverage'
                }
            }
        }

        
        stage('Build API Image') {
            steps {
                sh '''
                    docker build \
                    --build-arg BUILD_NUMBER=$BUILD_NUMBER \
                    --build-arg GIT_COMMIT=$(git rev-parse --short=7 HEAD) \
                    -t jenkins-api:$BUILD_NUMBER \
                    ./api
                '''
            }
}

        stage('Build WEB Image') {
            steps {
                sh '''
                    docker build \
                    -t jenkins-web:$BUILD_NUMBER \
                    ./web
                '''
            }
        }
        stage('Integration Test') {
            steps {
                sh '''
                    set -e

                    docker rm -f test-api test-web 2>/dev/null || true
                    docker network rm jenkins-test-network 2>/dev/null || true

                    docker network create jenkins-test-network

                    docker run -d \
                    --name test-api \
                    --network jenkins-test-network \
                    --network-alias api \
                    jenkins-api:$BUILD_NUMBER

                    docker run -d \
                    --name test-web \
                    --network jenkins-test-network \
                    jenkins-web:$BUILD_NUMBER

                    sleep 5

                    docker exec test-web wget -qO- http://localhost/api/data

                    docker rm -f test-web test-api
                    docker network rm jenkins-test-network
                '''
            }
        }

    }
}