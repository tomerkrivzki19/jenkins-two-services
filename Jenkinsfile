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

        stage('API Tests') {
            steps {
                dir('api') {
                    sh 'npm test'
                }
            }
        }
    }
}