FROM node:13.10.1

WORKDIR /usr/src/app
COPY package.json ./
COPY package-lock.json ./
COPY . ./

RUN npm install

EXPOSE 3000

ENV PUB_DIR "test/integration/pub"

CMD [ "npm", "start" ]