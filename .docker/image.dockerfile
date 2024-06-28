FROM oven/bun:1.1-debian AS build

USER root
WORKDIR /code

# System dependencies
RUN apt update -qq && apt install -qq -y git-crypt

# NPM packages
COPY bun.lockb package.json ./
RUN bun install --frozen-lockfile --production --no-cache && bun pm cache rm

FROM build

# Copy all files
COPY . .

# Unlock git-crypt
ARG CRYPT64
RUN echo $CRYPT64 | base64 -d >> gc_temp.key && \
    git -c user.name='A' -c user.email='a@a.co' stash || echo "Couldn't stash" && \
    git-crypt unlock gc_temp.key && \
    git -c user.name='A' -c user.email='a@a.co' stash pop || echo "Couldn't stash" && \
    rm gc_temp.key

CMD [ "bash", ".docker/entrypoint.sh" ]
