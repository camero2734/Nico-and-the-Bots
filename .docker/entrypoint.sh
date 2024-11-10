#!/bin/bash

echo "UPDATE_DB=$UPDATE_DB"

if [ "$UPDATE_DB" == "1" ]; then
    bun run tasks:fetch-db
    (pv -fp $(ls -t *.backup.tgz | head -1) | tar xzfO - | pg_restore -d $DATABASE_URL -c) 2>&1 | stdbuf -o0 tr '\r' '\n'
fi

# Run migrations
bunx prisma migrate deploy

if [ "$NODE_ENV" == "development" ]; then
    echo "Running in development mode"
    sleep 100000
else
    bun run app.ts
fi
