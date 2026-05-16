#!/bin/bash
LOG=/home/z/my-project/dev.log
while true; do
  cd /home/z/my-project
  echo "$(date): Starting standalone server..." >> $LOG
  node .next/standalone/server.js >> $LOG 2>&1
  EXIT_CODE=$?
  echo "$(date): Server exited with code $EXIT_CODE, restarting in 2 seconds..." >> $LOG
  sleep 2
done
