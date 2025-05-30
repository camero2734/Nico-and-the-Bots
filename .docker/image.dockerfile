FROM oven/bun:1.2.15-debian AS build

USER root
WORKDIR /code

# System dependencies
RUN apt update -qq && apt install -qq -y curl gnupg lsb-release && \
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/postgresql-archive-keyring.gpg] http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | tee /etc/apt/sources.list.d/postgresql.list && \
    apt update -qq && apt install -qq -y git-crypt pv postgresql-client-16 && \
    apt clean && rm -rf /var/lib/apt/lists/*

# NPM packages
COPY bun.lock package.json ./
RUN bun install --frozen-lockfile --production --no-cache && bun pm cache rm

FROM build

# Copy all files
COPY . .

# Build prisma
RUN bunx prisma generate

# Unlock git-crypt
ARG CRYPT64
RUN echo $CRYPT64 | base64 -d >> gc_temp.key && \
    git -c user.name='A' -c user.email='a@a.co' stash || echo "Couldn't stash" && \
    git-crypt unlock gc_temp.key && \
    git -c user.name='A' -c user.email='a@a.co' stash pop || echo "Couldn't stash" && \
    rm gc_temp.key

ARG COMMIT_SHA
ENV COMMIT_SHA=$COMMIT_SHA

CMD [ "bash", ".docker/entrypoint.sh" ]
