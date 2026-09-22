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

        stage('Docker Info') {
            steps {
                sh 'docker --version'
                sh 'docker ps'
            }
        }

        stage('Docker Build') {
            steps {
                sh 'docker build -t kriszotod-web:jenkins .'
            }
        }
    }
}
