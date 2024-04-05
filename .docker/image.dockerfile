# Stage 1: Build stage
FROM oven/bun:1.1-debian

USER root
WORKDIR /code

# System dependencies
RUN apt update && apt install -y git-crypt

# Copy all files
COPY . .

# NPM packages
COPY bun.lockb package.json ./
RUN bun install --frozen-lockfile --production --no-cache && \
    bun pm cache rm && \
    rm -rf node_modules/@faker-js/faker/dist/cjs && \
    rm -rf node_modules/@faker-js/faker/dist/types && \
    rm -rf node_modules/date-fns/fp && \
    rm -rf node_modules/@aws-sdk/client-s3/dist-types && \
    rm -rf node_modules/@smithy/types

# Unlock git-crypt
ARG CRYPT64
RUN echo $CRYPT64 | base64 -d >> gc_temp.key && \
    git -c user.name='A' -c user.email='a@a.co' stash || echo "Couldn't stash" && \
    git-crypt unlock gc_temp.key && \
    git -c user.name='A' -c user.email='a@a.co' stash pop || echo "Couldn't stash" && \
    rm gc_temp.key

# Whether or not to pull the production DB
ARG UPDATE_DB
ENV UPDATE_DB=$UPDATE_DB

CMD [ "bash", ".docker/entrypoint.sh" ]
