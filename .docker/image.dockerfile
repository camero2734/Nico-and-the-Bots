# Stage 1: Build stage
FROM oven/bun:1.1-debian AS builder

USER root
WORKDIR /code

# System dependencies
RUN apt update && apt install -y gnupg2 wget curl git-crypt pv unzip python3 make g++ llvm jq

# NPM packages
COPY bun.lockb package.json ./
RUN bun install --frozen-lockfile --production --no-cache && \
    bun pm cache rm && \
    rm -rf node_modules/@faker-js/faker/dist/cjs && \
    rm -rf node_modules/@faker-js/faker/dist/types && \
    rm -rf node_modules/date-fns/locale && \
    rm -rf node_modules/date-fns/esm/locale && \
    rm -rf node_modules/date-fns/fp && \
    rm -rf node_modules/@aws-sdk/client-s3/dist-types && \
    rm -rf node_modules/@smithy/types

# Stage 2: Final stage
FROM oven/bun:1.1-debian

USER root
WORKDIR /code

# System dependencies
RUN apt update && apt install -y gnupg2 wget curl git-crypt pv unzip python3 make g++ llvm jq

# Copy from the builder stage
COPY --from=builder /code/node_modules ./node_modules

# Copy all files
COPY . .

# Unlock git-crypt
ARG CRYPT64
RUN echo $CRYPT64 | base64 -d >> gc_temp.key
RUN git -c user.name='A' -c user.email='a@a.co' stash || echo "Couldn't stash"
RUN git-crypt unlock gc_temp.key
RUN git -c user.name='A' -c user.email='a@a.co' stash pop || echo "Couldn't stash"
RUN rm gc_temp.key

# Whether or not to pull the production DB
ARG UPDATE_DB
ENV UPDATE_DB=$UPDATE_DB

CMD [ "bash", ".docker/entrypoint.sh" ]
