#!/bin/bash
# Auto-restart wrapper for Next.js server
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting Next.js production server..." >> /home/z/my-project/dev.log
  PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js >> /home/z/my-project/dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 2s..." >> /home/z/my-project/dev.log
  sleep 2
done
