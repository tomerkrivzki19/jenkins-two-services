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
    }
}