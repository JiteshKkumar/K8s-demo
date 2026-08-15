pipeline {

    agent any

    environment {

        AWS_REGION = 'ap-south-1'

        AWS_ACCOUNT_ID = '747855627478'

        ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

        FRONTEND_REPO = "${ECR_REGISTRY}/demo-frontend"

        BACKEND_REPO = "${ECR_REGISTRY}/demo-backend"

        FRONTEND_IMAGE = "${FRONTEND_REPO}:${BUILD_NUMBER}"

        BACKEND_IMAGE = "${BACKEND_REPO}:${BUILD_NUMBER}"

        EKS_CLUSTER = 'demo-eks'

        K8S_NAMESPACE = 'demo'
    }

    triggers {
        githubPush()
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Verify Tools') {
            steps {
                sh '''
                    set -e

                    echo "Checking tools..."

                    aws --version
                    docker --version
                    kubectl version --client

                    echo "AWS Account:"
                    aws sts get-caller-identity
                '''
            }
        }

        stage('Build Frontend') {
            steps {
                sh '''
                    set -e

                    echo "Building frontend image:"
                    echo "${FRONTEND_IMAGE}"

                    docker build \
                        -t "${FRONTEND_IMAGE}" \
                        ./frontend
                '''
            }
        }

        stage('Build Backend') {
            steps {
                sh '''
                    set -e

                    echo "Building backend image:"
                    echo "${BACKEND_IMAGE}"

                    docker build \
                        -t "${BACKEND_IMAGE}" \
                        ./backend
                '''
            }
        }

        stage('Login to ECR') {
            steps {
                sh '''
                    set -e

                    echo "Logging into ECR..."

                    aws ecr get-login-password \
                        --region "${AWS_REGION}" \
                    | docker login \
                        --username AWS \
                        --password-stdin \
                        "${ECR_REGISTRY}"
                '''
            }
        }

        stage('Push Images') {
            steps {
                sh '''
                    set -e

                    echo "Pushing frontend..."
                    docker push "${FRONTEND_IMAGE}"

                    echo "Pushing backend..."
                    docker push "${BACKEND_IMAGE}"
                '''
            }
        }

        stage('Configure Kubernetes') {
            steps {
                sh '''
                    set -e

                    echo "Configuring Kubernetes..."

                    aws eks update-kubeconfig \
                        --region "${AWS_REGION}" \
                        --name "${EKS_CLUSTER}"

                    kubectl cluster-info
                '''
            }
        }

        stage('Deploy Namespace') {
            steps {
                sh '''
                    set -e

                    kubectl apply \
                        -f k8s/namespace.yaml
                '''
            }
        }

        stage('Deploy Backend') {
            steps {
                sh '''
                    set -e

                    echo "Deploying backend..."

                    sed "s|BACKEND_IMAGE|${BACKEND_IMAGE}|g" \
                        k8s/backend.yaml \
                    | kubectl apply -f -
                '''
            }
        }

        stage('Deploy Frontend') {
            steps {
                sh '''
                    set -e

                    echo "Deploying frontend..."

                    sed "s|FRONTEND_IMAGE|${FRONTEND_IMAGE}|g" \
                        k8s/frontend.yaml \
                    | kubectl apply -f -
                '''
            }
        }

        stage('Deploy Ingress') {
            steps {
                sh '''
                    set -e

                    echo "Deploying ingress..."

                    kubectl apply \
                        -f k8s/ingress.yaml
                '''
            }
        }

        stage('Wait for Backend') {
            steps {
                sh '''
                    set -e

                    echo "Waiting for backend..."

                    kubectl rollout status \
                        deployment/backend \
                        -n "${K8S_NAMESPACE}" \
                        --timeout=180s
                '''
            }
        }

        stage('Wait for Frontend') {
            steps {
                sh '''
                    set -e

                    echo "Waiting for frontend..."

                    kubectl rollout status \
                        deployment/frontend \
                        -n "${K8S_NAMESPACE}" \
                        --timeout=180s
                '''
            }
        }

        stage('Verify') {
            steps {
                sh '''
                    set -e

                    echo "===================="
                    echo "DEPLOYMENT"
                    echo "===================="

                    kubectl get deployments \
                        -n "${K8S_NAMESPACE}"

                    echo ""
                    echo "===================="
                    echo "PODS"
                    echo "===================="

                    kubectl get pods \
                        -n "${K8S_NAMESPACE}" \
                        -o wide

                    echo ""
                    echo "===================="
                    echo "SERVICES"
                    echo "===================="

                    kubectl get services \
                        -n "${K8S_NAMESPACE}"

                    echo ""
                    echo "===================="
                    echo "INGRESS"
                    echo "===================="

                    kubectl get ingress \
                        -n "${K8S_NAMESPACE}"
                '''
            }
        }
    }

    post {

        success {
            echo '========================================='
            echo 'Deployment completed successfully!'
            echo "Build: ${BUILD_NUMBER}"
            echo "Frontend: ${FRONTEND_IMAGE}"
            echo "Backend: ${BACKEND_IMAGE}"
            echo '========================================='
        }

        failure {
            echo 'Deployment failed. Check Jenkins console output.'
        }

        always {
            sh '''
                docker image prune -f || true
            '''
        }
    }
}
