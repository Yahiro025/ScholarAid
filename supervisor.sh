#!/bin/bash
cd /home/z/my-project
while true; do
  echo "$(date): Starting server..." >> /home/z/my-project/supervisor.log
  node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  EXIT_CODE=$?
  echo "$(date): Server exited with code $EXIT_CODE" >> /home/z/my-project/supervisor.log
  sleep 2
done
