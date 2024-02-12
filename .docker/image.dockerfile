# syntax = docker/dockerfile:experimental
FROM node:iron-buster-slim

USER root
WORKDIR /code

# System dependencies
RUN apt update
RUN apt install -y gnupg2 wget
RUN sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt buster-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

RUN apt update
RUN apt install -y git-crypt postgresql-client-14 pv curl unzip
# ...  build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
RUN npm i -g pm2 is-ci husky gen-esm-wrapper typescript@latest rimraf npm-run-all

# NPM packages
RUN curl -fsSL https://bun.sh/install | bash
RUN mv /root/.bun/bin/* /usr/local/bin
COPY bun.lockb package.json ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --verbose

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
