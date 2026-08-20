pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test Jenkins Connection') {
            steps {
                echo 'Jenkins successfully connected to GitHub'
            }
        }
    }
}