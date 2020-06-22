#Specify base image
FROM amazonlinux

WORKDIR /usr/src/app

RUN yum -y install python-pip

RUN curl -sL https://rpm.nodesource.com/setup_8.x | bash -
RUN yum -y install nodejs

COPY package.json /usr/src/app

RUN npm install

RUN mkdir src

COPY src /usr/src/app/src

RUN yum install sqlite
RUN mkdir ../db/
RUN sqlite3 ../db/manifest_info.db "create table manifest_information(ID INTEGER PRIMARY KEY, EXTINFO TEXT, TIME INTEGER, LOCATION TEXT, FILENAME TEXT);"

RUN npm run init_tsc

# CMD ["node", "src/index.js"]