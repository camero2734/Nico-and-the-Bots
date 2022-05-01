#!/bin/bash

echo "UPDATE_DB=$UPDATE_DB"

if [ "$UPDATE_DB" == "1" ]; then
    yarn tasks:fetch-db
    (pv -fp $(ls -t *.backup.tgz | head -1) | tar xzfO - | pg_restore -d $DATABASE_URL -c) 2>&1 | stdbuf -o0 tr '\r' '\n'
fi

# Run migrations
npx prisma migrate deploy
npx prisma generate

if [ "$NODE_ENV" == "development" ]; then
    yarn dev
else
    yarn start
fi
