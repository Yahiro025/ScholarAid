#!/bin/bash
cd /home/z/my-project
# Kill any existing server
pkill -f "next dev" 2>/dev/null
sleep 2
while true; do
  echo "[$(date)] Starting Next.js dev server..." >> /home/z/my-project/dev.log
  node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Next.js exited with code $EXIT_CODE. Restarting in 2s..." >> /home/z/my-project/dev.log
  sleep 2
done
