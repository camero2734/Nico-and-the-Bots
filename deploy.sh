#!/usr/bin/env sh

shopt -s expand_aliases
source ~/.bashrc

nico_deploy # Local alias that triggers new deployment

echo "Waiting for deploy..."

# This command will be killed when the deploy is finished
nico "sleep 678" && echo "Deploy failed" && exit 1 # If it isn't killed (deploy failed), it will exit here

echo "Deploy done. Killing local processes"

# Kill local running process
ps aux | awk '/node/,NF=1' | xargs kill -f