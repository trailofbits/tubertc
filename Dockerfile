# Very very simple Dockerfile for building and deploying tubertc
# you'll need to customize this to add SSL etc. and you will need to place
# this file in the parent directory of your checkout.
FROM ubuntu:14.04
# add the package rfc5766-turn-server to roll your own turn server
RUN apt-get update && apt-get install -y curl ca-certificates && apt-get clean
RUN mkdir -p /opt
ADD tubertc /opt/tubertc
WORKDIR /opt/tubertc
#INSTALL THE SERVICE AND DEPENDENCIES
# for SSL add certs below
#ADD tubertc/settings.ssl.json /opt/tubertc/settings.json
#ADD server.crt /opt/tubertc/server.crt
#ADD server.key /opt/tubertc/server.key
RUN /opt/tubertc/run.sh -i
CMD /opt/tubertc/run.sh
