#!/usr/bin/env sh

shopt -s expand_aliases
source ~/.bashrc

vultr_deploy # Local alias that triggers new deployment

echo "Waiting for deploy..."

# This command will be killed when the deploy is finished
vultr "sleep 678" # ssh ... "sleep 678"

echo "Deploy done. Killing local processes"

# Kill local running process
ps aux | awk '/node/,NF=1' | xargs kill -f