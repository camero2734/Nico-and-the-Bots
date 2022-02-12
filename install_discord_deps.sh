#!/usr/bin/env bash

set -e

# Installs and links to specified commits to test new discord.js features
# before release
BRANCH="https://github.com/suneettipirneni/discord.js.git"

# Clone monorepo
rm -rf /tmp/discord.js || true
git clone $BRANCH /tmp/discord.js
PROJ=$(pwd)

# Builders
ROOT="/tmp/discord.js"
cd "$ROOT/packages/builders"
yarn
yarn build
yarn pack
mv package.tgz "$PROJ/.discord/builders.tgz"

# Remove installed
cd $PROJ
rm -rf node_modules/@discordjs/builders
yarn remove @discordjs/builders --ignore-scripts || true

# Unpack
rm -rf .discord/builders
mkdir -p .discord/builders
tar xf .discord/builders.tgz -C .discord/builders --strip-components 1
rm .discord/builders.tgz

# Link
cd .discord/builders
yarn link

cd $PROJ
yarn link @discordjs/builders --ignore-scripts

echo "Done"