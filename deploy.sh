#!/bin/bash

# Version management - update this to match package.json
oldversion="1.0.3"
newversion="1.0.4"

# Color codes
RED="\033[0;31m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
END="\033[0m"

# Paths
PARENT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
export KUBECONFIG=${PARENT_PATH}/k8s/kubeconfig.yaml

echo -e "${GREEN}[LOG]${CYAN} Starting EAchieversClub deployment to Kyma v$newversion${END}"
echo "============================================================"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found${END}"
    echo "Please create a .env file with your HANA database credentials:"
    echo "  VDB_H=your-hana-host"
    echo "  VDB_N=443"  
    echo "  VDB_U=your-hana-user"
    echo "  VDB_P=your-hana-password"
    exit 1
fi

echo -e "${YELLOW}Reading database configuration from .env file...${END}"

# Source .env file to get database credentials
source .env

# Validate required environment variables
if [ -z "$VDB_H" ] || [ -z "$VDB_U" ] || [ -z "$VDB_P" ]; then
    echo -e "${RED}Error: Missing required database credentials in .env file${END}"
    echo "Please ensure your .env file contains:"
    echo "  VDB_H=your-hana-host"
    echo "  VDB_U=your-hana-user"  
    echo "  VDB_P=your-hana-password"
    exit 1
fi

# Set default port if not specified
VDB_N=${VDB_N:-443}

echo -e "${GREEN}✓ Database configuration loaded${END}"
echo "  Host: $VDB_H"
echo "  Port: $VDB_N" 
echo "  User: $VDB_U"

echo -e "${YELLOW}Creating/updating Kubernetes secrets...${END}"

# Create or update HANA credentials secret
kubectl create secret generic hana-credentials \
    --from-literal=host="$VDB_H" \
    --from-literal=port="$VDB_N" \
    --from-literal=user="$VDB_U" \
    --from-literal=password="$VDB_P" \
    --dry-run=client -o yaml | kubectl apply -f -

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ HANA credentials secret created/updated${END}"
else
    echo -e "${RED}✗ Failed to create HANA credentials secret${END}"
    exit 1
fi

echo -e "${YELLOW}Updating image version in manifest...${END}"
temp_manifest="/tmp/app-deployment.yaml"
cp k8s/app.yaml $temp_manifest
sed -i.bak "s/mppise\/ea-appreciate:$oldversion/mppise\/ea-appreciate:$newversion/g" $temp_manifest

echo -e "${GREEN}Building Docker image...${END}"
docker build -t mppise/ea-appreciate:$newversion .

if [ $? -ne 0 ]; then
    echo -e "${RED}Docker build failed${END}"
    exit 1
fi

echo -e "${GREEN}Pushing Docker image to registry...${END}"
docker push mppise/ea-appreciate:$newversion

if [ $? -ne 0 ]; then
    echo -e "${RED}Docker push failed${END}"
    exit 1
fi

echo -e "${GREEN}Deploying application to Kyma...${END}"
kubectl apply -f $temp_manifest

if [ $? -ne 0 ]; then
    echo -e "${RED}Kubernetes deployment failed${END}"
    exit 1
fi

# Apply API Rule if it exists
if [ -f "k8s/kyma.yaml" ]; then
    echo -e "${YELLOW}Applying API rules...${END}"
    kubectl apply -f k8s/kyma.yaml
fi

# Clean up temporary files
rm -f $temp_manifest
rm -f $temp_manifest.bak

# Clean up old Docker image
echo -e "${YELLOW}Cleaning up old Docker image...${END}"
docker rmi mppise/ea-appreciate:$oldversion 2>/dev/null || true

echo -e "${GREEN}Waiting for deployment to be ready...${END}"
kubectl wait --for=condition=available --timeout=300s deployment/ea-appreciate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment completed successfully for version $newversion${END}"
    echo "============================================================"
    
    # Show deployment status
    echo -e "${YELLOW}Pod status:${END}"
    kubectl get pods -l app=ea-appreciate
    
    echo -e "${YELLOW}Service status:${END}"
    kubectl get svc ea-appreciate-svc
    
    # Check application logs
    echo -e "${YELLOW}Recent application logs:${END}"
    kubectl logs -l app=ea-appreciate --tail=10
    
    # Test health endpoint
    echo -e "${YELLOW}Testing health endpoint...${END}"
    kubectl port-forward service/ea-appreciate-svc 8080:8100 &
    PORTFORWARD_PID=$!
    sleep 5
    HEALTH_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:8080/health)
    kill $PORTFORWARD_PID 2>/dev/null
    
    if [[ $HEALTH_RESPONSE == *"200"* ]]; then
        echo -e "${GREEN}✓ Health check passed - application is healthy${END}"
    else
        echo -e "${YELLOW}⚠ Health check returned: $HEALTH_RESPONSE${END}"
    fi
    
else
    echo -e "${RED}✗ Deployment failed or timed out${END}"
    echo "============================================================"
    echo -e "${YELLOW}Deployment details:${END}"
    kubectl describe deployment ea-appreciate
    echo -e "${YELLOW}Application logs:${END}"
    kubectl logs -l app=ea-appreciate --tail=50
    exit 1
fi

echo
echo "============================================================"
echo -e "${GREEN}🎉 EAchieversClub deployment completed successfully!${END}"
echo -e "${CYAN}Your application is now running on SAP BTP Kyma with database connectivity.${END}"
echo "============================================================"