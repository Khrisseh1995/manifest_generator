FROM node:12

WORKDIR /usr/src/app

COPY package.json /usr/src/app

RUN npm install

RUN mkdir src

COPY src /usr/src/app/src

COPY . /usr/src/app

RUN mkdir ../streams/

#Probs wanna remove this for a prod build
RUN apt-get update
RUN apt-get -y install vim

# RUN npm run init_tsc

# CMD ["npm", "run", "start"]
