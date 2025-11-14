FROM node as base-image

FROM base-image as catalog-service-production
WORKDIR /app
RUN apt-get update && apt-get install -y sqlite3
COPY package.json .
COPY ./src/nginx .
RUN npm install
COPY ./src/catalog-service .
CMD ["npm", "run", "start-catalog"]

FROM base-image as order-service-production
WORKDIR /app
RUN apt-get update && apt-get install -y sqlite3
COPY package.json .
COPY ./src/nginx .
RUN npm install
COPY ./src/order-service .
CMD ["npm", "run", "start-order"]

FROM base-image as client-service-production
WORKDIR /app
COPY package.json .
COPY ./src/nginx .
RUN npm install
COPY ./src/client-service .
CMD ["npm", "run", "start-client"]
