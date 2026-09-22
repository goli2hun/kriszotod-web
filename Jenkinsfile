pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Inspect') {
            steps {
                sh 'pwd'
                sh 'ls -la'
            }
        }
    }
}
