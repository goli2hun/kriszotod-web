pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
    }

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
