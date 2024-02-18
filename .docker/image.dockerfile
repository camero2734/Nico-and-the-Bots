# Any newer version of bun breaks prisma, https://github.com/oven-sh/bun/issues/7864
FROM oven/bun:1.0.18-slim

USER root
WORKDIR /code

# System dependencies
RUN apt update
RUN apt install -y gnupg2 wget curl
RUN sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt buster-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

# Node for Prisma
ARG NODE_VERSION=18
RUN curl -L https://raw.githubusercontent.com/tj/n/master/bin/n -o n \
    && bash n $NODE_VERSION \
    && rm n \
    && npm install -g n

RUN apt update
RUN apt install -y git-crypt pv unzip python3 make g++ llvm jq
# ... postgresql-client-14 build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# NPM packages
COPY bun.lockb package.json ./

# canvas broken if installed with scripts w/ bun :(
# Won't be necessary once bun >= v1.0.23 can be installed
RUN bun install --frozen-lockfile --ignore-scripts

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
