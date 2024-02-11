# syntax = docker/dockerfile:experimental
FROM node:iron-buster

USER root
WORKDIR /code

# System dependencies
RUN sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt buster-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

RUN apt update
RUN apt install -y git-crypt postgresql-client-14 pv build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
RUN npm i -g pm2 is-ci husky gen-esm-wrapper typescript@latest rimraf npm-run-all

# NPM packages
COPY yarn.lock package.json ./
RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn \
    yarn install --frozen-lockfile --pure-lockfile

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

RUN apt install -y libstdc++6 gcc g++ make

CMD [ "bash", ".docker/entrypoint.sh" ]
