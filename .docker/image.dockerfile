FROM oven/bun:1.0-debian

USER root
WORKDIR /code

# System dependencies
RUN apt update
RUN apt install -y gnupg2 wget curl git-crypt pv unzip python3 make g++ llvm jq

# Node for Prisma
ARG NODE_VERSION=20
RUN curl -L https://raw.githubusercontent.com/tj/n/master/bin/n -o n \
    && bash n $NODE_VERSION \
    && rm n \
    && npm install -g n

# NPM packages
COPY bun.lockb package.json ./
RUN bun install --frozen-lockfile

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
