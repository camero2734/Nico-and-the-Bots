#!/usr/bin/env fish

rm -rf artifacts/
kompose convert -o artifacts/

# kubectl apply --force -f artifacts/
