# Very very simple Dockerfile for building and deploying tubertc
# you'll need to customize this to add SSL etc. and you will need to place
# this file in the parent directory of your checkout.
FROM ubuntu:14.04
RUN apt-get update && apt-get install -y curl ca-certificates && apt-get clean
RUN mkdir -p /opt
ADD tubertc /opt/tubertc
WORKDIR /opt/tubertc
#INSTALL THE SERVICE AND DEPENDENCIES
RUN /opt/tubertc/run.sh -i
CMD /opt/tubertc/run.sh
