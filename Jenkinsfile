pipeline {

    agent any

    triggers {
        githubPush()
    }

    environment {

        AWS_REGION = 'ap-south-1'
        AWS_ACCOUNT_ID = '747855627478'

        EKS_CLUSTER_NAME = 'demo-eks'

        NAMESPACE = 'demo'

        ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

        FRONTEND_REPOSITORY = "${ECR_REGISTRY}/demo-frontend"
        BACKEND_REPOSITORY = "${ECR_REGISTRY}/demo-backend"

        FRONTEND_IMAGE = "${FRONTEND_REPOSITORY}:${BUILD_NUMBER}"
        BACKEND_IMAGE = "${BACKEND_REPOSITORY}:${BUILD_NUMBER}"

        KUBECONFIG = "${WORKSPACE}/.kube/config"
    }

    stages {

        /*
         * =========================================
         * CHECKOUT
         * =========================================
         */

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


        /*
         * =========================================
         * BUILD INFORMATION
         * =========================================
         */

        stage('Show Build Information') {
            steps {
                echo '========================================='
                echo "Build Number: ${BUILD_NUMBER}"
                echo "Frontend Image: ${FRONTEND_IMAGE}"
                echo "Backend Image: ${BACKEND_IMAGE}"
                echo "EKS Cluster: ${EKS_CLUSTER_NAME}"
                echo "Namespace: ${NAMESPACE}"
                echo '========================================='
            }
        }


        /*
         * =========================================
         * CONFIGURE EKS
         * =========================================
         */

        stage('Configure AWS / EKS') {
            steps {
                sh '''
                    set -e

                    echo "========================================="
                    echo "CONFIGURING AWS / EKS"
                    echo "========================================="

                    echo "AWS Identity:"
                    aws sts get-caller-identity

                    echo ""
                    echo "EKS Cluster:"
                    aws eks describe-cluster \
                        --region "${AWS_REGION}" \
                        --name "${EKS_CLUSTER_NAME}" \
                        --query 'cluster.{name:name,status:status,endpoint:endpoint,public:resourcesVpcConfig.endpointPublicAccess,private:resourcesVpcConfig.endpointPrivateAccess}' \
                        --output table

                    echo ""
                    echo "Creating kubeconfig directory..."

                    mkdir -p "$(dirname "${KUBECONFIG}")"

                    echo ""
                    echo "Updating kubeconfig..."

                    aws eks update-kubeconfig \
                        --region "${AWS_REGION}" \
                        --name "${EKS_CLUSTER_NAME}" \
                        --kubeconfig "${KUBECONFIG}"

                    echo ""
                    echo "Current kubectl context:"

                    kubectl config current-context

                    echo ""
                    echo "Testing Kubernetes authentication..."

                    kubectl get nodes

                    echo ""
                    echo "Kubernetes authentication successful."
                '''
            }
        }


        /*
         * =========================================
         * BUILD FRONTEND
         * =========================================
         */

        stage('Build Frontend Docker Image') {
            steps {
                sh '''
                    set -e

                    echo "Building frontend image..."

                    docker build \
                        --pull \
                        -t "${FRONTEND_IMAGE}" \
                        ./frontend
                '''
            }
        }


        /*
         * =========================================
         * BUILD BACKEND
         * =========================================
         */

        stage('Build Backend Docker Image') {
            steps {
                sh '''
                    set -e

                    echo "Building backend image..."

                    docker build \
                        --pull \
                        -t "${BACKEND_IMAGE}" \
                        ./backend
                '''
            }
        }


        /*
         * =========================================
         * LOGIN ECR
         * =========================================
         */

        stage('Login to AWS ECR') {
            steps {
                sh '''
                    set -e

                    echo "Logging into AWS ECR..."

                    aws ecr get-login-password \
                        --region "${AWS_REGION}" | \
                    docker login \
                        --username AWS \
                        --password-stdin "${ECR_REGISTRY}"
                '''
            }
        }


        /*
         * =========================================
         * PUSH FRONTEND
         * =========================================
         */

        stage('Push Frontend Image') {
            steps {
                sh '''
                    set -e

                    echo "Pushing frontend image..."

                    docker push "${FRONTEND_IMAGE}"
                '''
            }
        }


        /*
         * =========================================
         * PUSH BACKEND
         * =========================================
         */

        stage('Push Backend Image') {
            steps {
                sh '''
                    set -e

                    echo "Pushing backend image..."

                    docker push "${BACKEND_IMAGE}"
                '''
            }
        }


        /*
         * =========================================
         * VERIFY KUBERNETES
         * =========================================
         */

        stage('Verify Kubernetes Access') {
            steps {
                sh '''
                    set -e

                    echo "========================================="
                    echo "VERIFYING KUBERNETES ACCESS"
                    echo "========================================="

                    kubectl cluster-info

                    echo ""
                    kubectl get nodes

                    echo ""
                    kubectl get namespaces
                '''
            }
        }


        /*
         * =========================================
         * DEPLOY NAMESPACE
         * =========================================
         */

        stage('Deploy Namespace') {
            steps {
                sh '''
                    set -e

                    echo "Creating namespace..."

                    kubectl apply \
                        -f k8s/namespace.yaml
                '''
            }
        }


        /*
         * =========================================
         * DEPLOY BACKEND
         * =========================================
         */

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


        /*
         * =========================================
         * DEPLOY FRONTEND
         * =========================================
         */

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


        /*
         * =========================================
         * DEPLOY INGRESS
         * =========================================
         */

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


        /*
         * =========================================
         * WAIT BACKEND
         * =========================================
         */

        stage('Wait for Backend') {
            steps {
                sh '''
                    set -e

                    echo "Waiting for backend rollout..."

                    kubectl rollout status \
                        deployment/backend \
                        -n "${NAMESPACE}" \
                        --timeout=180s
                '''
            }
        }


        /*
         * =========================================
         * WAIT FRONTEND
         * =========================================
         */

        stage('Wait for Frontend') {
            steps {
                sh '''
                    set -e

                    echo "Waiting for frontend rollout..."

                    kubectl rollout status \
                        deployment/frontend \
                        -n "${NAMESPACE}" \
                        --timeout=180s
                '''
            }
        }


        /*
         * =========================================
         * VERIFY DEPLOYMENT
         * =========================================
         */

        stage('Verify Deployment') {
            steps {
                sh '''
                    set -e

                    echo ""
                    echo "========================================="
                    echo "DEPLOYMENT STATUS"
                    echo "========================================="

                    echo ""
                    echo "DEPLOYMENTS"
                    kubectl get deployments \
                        -n "${NAMESPACE}"

                    echo ""
                    echo "PODS"
                    kubectl get pods \
                        -n "${NAMESPACE}" \
                        -o wide

                    echo ""
                    echo "SERVICES"
                    kubectl get services \
                        -n "${NAMESPACE}"

                    echo ""
                    echo "INGRESS"
                    kubectl get ingress \
                        -n "${NAMESPACE}"

                    echo ""
                    echo "RUNNING IMAGES"

                    kubectl get deployments \
                        frontend backend \
                        -n "${NAMESPACE}" \
                        -o=jsonpath='{range .items[*]}{.metadata.name}{" = "}{.spec.template.spec.containers[*].image}{"\\n"}{end}'

                    echo ""
                    echo "========================================="
                    echo "DEPLOYMENT VERIFIED"
                    echo "========================================="
                '''
            }
        }
    }


    /*
     * =========================================
     * POST
     * =========================================
     */

    post {

        success {
            echo '''
=========================================
DEPLOYMENT COMPLETED SUCCESSFULLY
=========================================
'''

            echo "Build: ${BUILD_NUMBER}"
            echo "Frontend: ${FRONTEND_IMAGE}"
            echo "Backend: ${BACKEND_IMAGE}"
            echo "Cluster: ${EKS_CLUSTER_NAME}"
            echo "Namespace: ${NAMESPACE}"
        }

        failure {
            echo '''
=========================================
DEPLOYMENT FAILED
=========================================
'''

            echo "Build: ${BUILD_NUMBER}"
            echo "Cluster: ${EKS_CLUSTER_NAME}"
        }

        always {
            sh '''
                docker image prune -f || true
            '''
        }
    }
}
