#!/bin/bash

echo "UPDATE_DB=$UPDATE_DB"

if [ "$UPDATE_DB" == "1" ]; then
    echo "Waiting for database to be ready"
    until pg_isready -d $DATABASE_URL; do
        echo "Waiting for database..."
        sleep 2
    done
    echo "Updating database"
    (pv -fp $(ls -t *.tgz | head -1) | tar xzfO - | pg_restore -d $DATABASE_URL --if-exists -e -c) 2>&1 | stdbuf -o0 tr '\r' '\n'
fi

# Run migrations
bunx prisma migrate deploy

if [ "$NODE_ENV" == "development" ]; then
    echo "Running in development mode"
    sleep 100000
else
    bun run app.ts
fi
