#Specify base image
FROM amazonlinux

COPY . /usr/src/app

RUN yum -y install wget
RUN yum -y install tar
RUN yum -y install xz

RUN wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz

RUN tar -xf ffmpeg-release-amd64-static.tar.xz

RUN rm -rf ffmpeg-release-amd64-static.tar.xz
RUN mv ffmpeg-4.3-amd64-static/ ffmpeg-bin

RUN yum -y install python-pip
RUN pip install awscli

RUN curl -sL https://rpm.nodesource.com/setup_12.x | bash -
RUN yum -y install nodejs
RUN yum install sqlite

RUN mkdir /db
RUN sqlite3 ./db/manifest_info.db "create table aTable(field1 int); drop table aTable;"



# ENV AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_HERE>
# ENV AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_KEY_HERE>