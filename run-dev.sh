#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting Next.js dev server..."
  node node_modules/.bin/next dev -p 3000
  echo "Server crashed, restarting in 3 seconds..."
  sleep 3
done
