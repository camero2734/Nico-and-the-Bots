FROM node:lts-gallium

# git-crypt key (in base64)
ARG CRYPT64

USER root

WORKDIR /code

RUN chown -R root:root .

COPY --chown=root:root . .

# System dependencies
RUN apt update
RUN apt install -y git-crypt

# Unlock git-crypt
RUN echo $CRYPT64 | base64 -d >> gc.key
RUN git-crypt unlock gc.key
RUN rm gc.key

# NPM packages
RUN yarn install --verbose
RUN yarn build

ENTRYPOINT ["sleep", "infinity"]