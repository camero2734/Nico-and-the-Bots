FROM oven/bun:1.3.0-debian AS build

STOPSIGNAL SIGTERM

USER root
WORKDIR /code

# System dependencies
RUN apt update -qq && apt install -qq -y curl gnupg lsb-release && \
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/postgresql-archive-keyring.gpg] http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | tee /etc/apt/sources.list.d/postgresql.list && \
    apt update -qq && apt install -qq -y git-crypt pv postgresql-client-16 python3 make && \
    apt clean && rm -rf /var/lib/apt/lists/* && \
    curl -fsSL https://github.com/earendil-works/absurd/releases/download/0.0.5/absurdctl -o absurdctl && \
    chmod +x absurdctl && mv absurdctl /usr/local/bin/absurdctl

# NPM packages
COPY bun.lock package.json ./
COPY patches ./patches
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
