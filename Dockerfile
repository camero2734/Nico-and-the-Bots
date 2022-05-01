FROM node:lts-gallium

USER root
WORKDIR /code

# System dependencies
RUN sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt buster-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
RUN apt update

RUN apt install -y git-crypt postgresql-client-14 pv
RUN npm i -g pm2

# NPM packages
COPY yarn.lock package.json ./
RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn yarn install --frozen-lockfile --pure-lockfile

# Copy all source files
COPY .gitignore .gitattributes ./
COPY src/ src/

# Unlock git-crypt
RUN git init
RUN git add src/
RUN git -c user.name='A' -c user.email='A@mail.co' commit -am "Dummy commit"
ARG CRYPT64
RUN echo $CRYPT64 | base64 -d >> gc.key
RUN git-crypt unlock gc.key
RUN rm gc.key

# Copy remaining files
COPY . .

# Whether or not to pull the production DB
ARG UPDATE_DB
ENV UPDATE_DB=$UPDATE_DB

CMD ["npx", "pm2-runtime", "ecosystem.config.js"]
