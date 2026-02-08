#!/bin/bash

# Version management
oldversion="1.0.2"
newversion="1.0.3"


# Color codes
RED="\033[0;31m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
END="\033[0m"

hold () {
  sec=$1
  while [ $sec -ge 0 ]; do
    echo -ne "Hold for $sec seconds...\033[0K\r"
    let "sec=sec-1"
    sleep 1
  done
}

# >>>> 
PARENT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
export KUBECONFIG=${PARENT_PATH}/k8s/kubeconfig.yaml
clear

if [ `ps -ef | grep -i "Docker.app" | wc -l` -gt 1 ]
then
  echo -e ${GREEN}Docker is running${END}
  hold 10
else
  echo -e ${RED}Docker is NOT running${END}
  open /Applications/Docker.app
  echo "Hold on while docker is started"
  while [ `ps -ef | grep -i "docker serve" | wc -l` -lt 2 ]; do
    sleep 10
    echo -ne "."
  hold 30
  done
  echo -e ${GREEN}Docker is NOW running${END}
fi

echo
echo
echo -e "${GREEN}[LOG]${CYAN} Fetch latest repository changes ...${END}"
echo "---------------------------------------------"
git pull origin main
hold 10

# echo
# echo
# echo -e "${GREEN}[LOG]${CYAN} Generate token for SAP AI Core access ...${END}"
# echo "---------------------------------------------"
# curl -X GET "https://sapit-core-playground-vole.authentication.eu10.hana.ondemand.com/oauth/token?grant_type=client_credentials" -H "Authorization:Basic c2ItZWQ1NWU5YzUtYmM5OS00NmY2LWFiNDQtNTA0MzZiZTVlMzNlIWIzMTMwOTF8YWlzdmMtNjYyMzE4ZjktaWVzLWFpY29yZS1zZXJ2aWNlIWI1NDA6NWQwM2Q4MmItM2QwZS00MjMwLWEzM2EtMmQ2NDQ2NGUwMDg1JGFhMTV1RnRWWlA4OUlMYWcwcl9md1FGTVk4RktndFVjZUhMWS1lT25neTg9" > token.json
# hold 10

echo
echo
echo -e "${GREEN}[LOG]${CYAN} Manage version ...${END}"
echo "---------------------------------------------"
# oldversion=$(<version.txt)

# IFS='.' eval 'array=($oldversion)'
# major=${array[0]}
# minor=${array[1]}
# patch=${array[2]}
# ((patch++))
# if [ $patch -ge 10 ]
# then
#   patch=0
#   ((minor++))
#   if [ $minor -ge 10 ]
#   then
#     minor=0
#     ((major++))
#   fi
# fi
# newversion="$major.$minor.$patch"

echo "$oldversion -> $newversion"
hold 10

echo
echo
echo -e "${GREEN}[LOG]${CYAN} Build new docker image and run ea-appreciate ...${END}"
echo "---------------------------------------------"
# --- Below needs to be done only once ---
# To pull an Image from a Private Registry (e.g. hub.docker.com), refer:
# https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
# ~
# kubectl create secret docker-registry dockerhub \
# --docker-server=https://index.docker.io/v1/ \
# --docker-username=mppise \
# --docker-password=savve5-jitqin-Wijguv \
# --docker-email=mppise@gmail.com
# Check contents of secret
# kubectl get secret dockerhub --output=yaml
# kubectl get secret dockerhub --output="jsonpath={.data.\.dockerconfigjson}" | base64 --decode
# Use this secret in kyma.yaml
# ~
# if [ `cat ${PARENT_PATH}/k8s/app.yaml | grep "ea-appreciate:$oldversion" | wc -l` -ge 1 ]
# then
#   echo "  [LOG] update app.yaml"
#   mv ${PARENT_PATH}/k8s/app.yaml ${PARENT_PATH}/k8s/ea-appreciate.old.yaml
#   sed "s/ea-appreciate:$oldversion/ea-appreciate:$newversion/g" ${PARENT_PATH}/k8s/ea-appreciate.old.yaml > ${PARENT_PATH}/k8s/app.yaml
#   if [ `cat ${PARENT_PATH}/k8s/app.yaml | grep "ea-appreciate:$newversion" | wc -l` -ge 1 ]
#   then
echo "  [LOG] build new images (v$newversion)"
docker build -t mppise/ea-appreciate:$newversion .
docker push mppise/ea-appreciate:$newversion
echo "  [LOG] cleanup images (v$oldversion & v$newversion)"
docker rmi mppise/ea-appreciate:$oldversion
# docker rmi mppise/ea-appreciate:$newversion
# echo "  [LOG] update version.txt"
# echo $newversion > version.txt
# cat version.txt
hold 10
echo
kubectl apply -f ${PARENT_PATH}/k8s/app.yaml
hold 30
echo
kubectl apply -f ${PARENT_PATH}/k8s/kyma.yaml
hold 30
#   else
#     echo -e ${RED}[X] version could not be updated!${END}
#     echo "Check if versions are same in version.txt and app.yaml"
#   fi
# else
#   echo -e ${RED}[X] incorrect version found in app.yaml!${END}
#   echo "Check if versions are same in version.txt and app.yaml"
# fi

echo
echo
echo -e "${GREEN}[LOG]${CYAN} Updating repository ...${END}"
echo "---------------------------------------------"
git add .
git commit -am "$newversion"
git push origin main

echo
echo
echo "---------------------------------------------"
echo -e "${GREEN}[LOG]${CYAN} ... END${END}"
echo "---------------------------------------------"

echo
echo
echo -e "${GREEN}[LOG]${CYAN} Open Monitoring Dashboards ...${END}"
echo "---------------------------------------------"
# Documentation.
# https://github.com/kyma-project/examples/blob/main/prometheus/prometheus.md

# You should see several Pods coming up in the Namespace, especially Prometheus and Alertmanager. Assure that all Pods have the "Running" state.
# Browse the Prometheus dashboard and verify that all "Status->Targets" are healthy. 
# The following command exposes the dashboard on http://localhost:9090:
export K8S_NAMESPACE="kyma-monitoring"
export HELM_PROM_RELEASE="prometheus"
# kubectl -n ${K8S_NAMESPACE} port-forward $(kubectl -n ${K8S_NAMESPACE} get service -l app=kube-prometheus-stack-prometheus -oname) 9090 &

# Browse the Grafana dashboard and verify that the dashboards are showing data. 
# The user admin is preconfigured in the Helm chart; the password was provided in your helm install command. 
# The following command exposes the dashboard on http://localhost:3000:
# kubectl -n ${K8S_NAMESPACE} port-forward svc/${HELM_PROM_RELEASE}-grafana 3000:80 &
