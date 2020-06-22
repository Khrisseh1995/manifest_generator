#Specify base image
FROM node:12

WORKDIR /usr/src/app

RUN wget https://www.johnvansickle.com/ffmpeg/old-releases/ffmpeg-4.2.2-amd64-static.tar.xz

RUN tar -xf ffmpeg-4.2.2-amd64-static.tar.xz

RUN rm -rf ffmpeg-4.2.2-amd64-static.tar.xz
RUN mkdir ../ffmpeg/
RUN mv ffmpeg-4.2.2-amd64-static/ ../ffmpeg/ffmpeg-bin

COPY package.json /usr/src/app

RUN npm install

RUN mkdir src

COPY src /usr/src/app/src

COPY . /usr/src/app

RUN mkdir ../streams/
RUN touch ../streams/test.m3u8

#Probs wanna remove this for a prod build
RUN apt-get update
RUN apt-get -y install vim

RUN npm run init_tsc

# CMD ["node", "transcoder.js"]
