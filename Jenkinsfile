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

        stage('Deploy') {
            steps {
                sh 'docker-compose down || true'
                sh 'docker-compose up -d --build'
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    sleep 3
                    docker-compose ps
                    curl --fail --silent --show-error http://host.docker.internal:8030/api/health
                '''
            }
        }
    }
}
