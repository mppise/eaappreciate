FROM node:20.4.0-alpine
WORKDIR /usr/app
COPY . .
ENV PORT=8100
ENV AICORE_RESOURCE_GROUP="default"
ENV VDB_H="fc29f922-622e-4bc9-b025-4a3174868bb9.hna2.prod-eu10.hanacloud.ondemand.com"
ENV VDB_N="443"
ENV VDB_U="DBADMIN"
ENV VDB_P="LLMkm@123"
RUN apk add libaio openssl
RUN npm install
EXPOSE 8080
CMD ["node", "index.js"]