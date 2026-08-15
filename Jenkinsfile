pipeline {

    agent any

    triggers {
        githubPush()
    }

    environment {

        AWS_REGION = 'ap-south-1'
        AWS_ACCOUNT_ID = '747855627478'

        ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

        FRONTEND_REPOSITORY = "${ECR_REGISTRY}/demo-frontend"
        BACKEND_REPOSITORY = "${ECR_REGISTRY}/demo-backend"

        NAMESPACE = 'demo'

        FRONTEND_IMAGE = "${FRONTEND_REPOSITORY}:${BUILD_NUMBER}"
        BACKEND_IMAGE = "${BACKEND_REPOSITORY}:${BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out source code...'

                checkout scm

                sh '''
                    set -e

                    echo "========================================="
                    echo "GIT INFORMATION"
                    echo "========================================="

                    echo "Commit:"
                    git rev-parse HEAD

                    echo "Latest commit:"
                    git log -1 --oneline

                    echo "Branch:"
                    git branch --show-current || true

                    echo "========================================="
                '''
            }
        }

        stage('Show Build Information') {
            steps {
                echo '========================================='
                echo "Build Number: ${BUILD_NUMBER}"
                echo "Frontend Image: ${FRONTEND_IMAGE}"
                echo "Backend Image: ${BACKEND_IMAGE}"
                echo "Namespace: ${NAMESPACE}"
                echo '========================================='
            }
        }

        stage('Build Frontend Docker Image') {
            steps {
                sh '''
                    set -e

                    echo "Building frontend image..."

                    docker build \
                        --pull \
                        -t ${FRONTEND_IMAGE} \
                        ./frontend
                '''
            }
        }

        stage('Build Backend Docker Image') {
            steps {
                sh '''
                    set -e

                    echo "Building backend image..."

                    docker build \
                        --pull \
                        -t ${BACKEND_IMAGE} \
                        ./backend
                '''
            }
        }

        stage('Login to AWS ECR') {
            steps {
                sh '''
                    set -e

                    echo "Logging into AWS ECR..."

                    aws ecr get-login-password \
                        --region ${AWS_REGION} | \
                    docker login \
                        --username AWS \
                        --password-stdin ${ECR_REGISTRY}
                '''
            }
        }

        stage('Push Frontend Image') {
            steps {
                sh '''
                    set -e

                    echo "Pushing frontend image..."

                    docker push ${FRONTEND_IMAGE}
                '''
            }
        }

        stage('Push Backend Image') {
            steps {
                sh '''
                    set -e

                    echo "Pushing backend image..."

                    docker push ${BACKEND_IMAGE}
                '''
            }
        }

        stage('Deploy Namespace') {
            steps {
                sh '''
                    set -e

                    echo "Creating namespace..."

                    kubectl apply -f k8s/namespace.yaml
                '''
            }
        }

        stage('Deploy Backend') {
            steps {
                sh '''
                    set -e

                    echo "Deploying backend..."

                    sed "s|BACKEND_IMAGE|${BACKEND_IMAGE}|g" \
                        k8s/backend.yaml | \
                        kubectl apply -f -
                '''
            }
        }

        stage('Deploy Frontend') {
            steps {
                sh '''
                    set -e

                    echo "Deploying frontend..."

                    sed "s|FRONTEND_IMAGE|${FRONTEND_IMAGE}|g" \
                        k8s/frontend.yaml | \
                        kubectl apply -f -
                '''
            }
        }

        stage('Deploy Ingress') {
            steps {
                sh '''
                    set -e

                    echo "Deploying ingress..."

                    kubectl apply -f k8s/ingress.yaml
                '''
            }
        }

        stage('Wait for Backend') {
            steps {
                sh '''
                    set -e

                    echo "Waiting for backend rollout..."

                    kubectl rollout status \
                        deployment/backend \
                        -n ${NAMESPACE} \
                        --timeout=180s
                '''
            }
        }

        stage('Wait for Frontend') {
            steps {
                sh '''
                    set -e

                    echo "Waiting for frontend rollout..."

                    kubectl rollout status \
                        deployment/frontend \
                        -n ${NAMESPACE} \
                        --timeout=180s
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                    set -e

                    echo ""
                    echo "========================================="
                    echo "DEPLOYMENTS"
                    echo "========================================="

                    kubectl get deployments -n ${NAMESPACE}

                    echo ""
                    echo "========================================="
                    echo "PODS"
                    echo "========================================="

                    kubectl get pods \
                        -n ${NAMESPACE} \
                        -o wide

                    echo ""
                    echo "========================================="
                    echo "SERVICES"
                    echo "========================================="

                    kubectl get services -n ${NAMESPACE}

                    echo ""
                    echo "========================================="
                    echo "INGRESS"
                    echo "========================================="

                    kubectl get ingress -n ${NAMESPACE}

                    echo ""
                    echo "========================================="
                    echo "RUNNING IMAGES"
                    echo "========================================="

                    kubectl get deployments \
                        frontend backend \
                        -n ${NAMESPACE} \
                        -o=jsonpath='{range .items[*]}{.metadata.name}{" = "}{.spec.template.spec.containers[*].image}{"\\n"}{end}'

                    echo ""
                '''
            }
        }
    }

    post {

        success {
            echo '''
=========================================
Deployment completed successfully!
=========================================
'''

            echo "Build: ${BUILD_NUMBER}"
            echo "Frontend: ${FRONTEND_IMAGE}"
            echo "Backend: ${BACKEND_IMAGE}"
        }

        failure {
            echo '''
=========================================
Deployment FAILED
=========================================
'''

            echo "Build: ${BUILD_NUMBER}"
        }

        always {
            sh '''
                docker image prune -f || true
            '''
        }
    }
}
