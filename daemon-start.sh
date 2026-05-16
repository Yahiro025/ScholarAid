#!/bin/bash
cd /home/z/my-project

# Use setsid with the auto-restart loop directly
setsid bash -c '
    cd /home/z/my-project
    while true; do
        PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js >> /home/z/my-project/dev.log 2>&1
        echo "[$(date)] Server exited, restarting in 2s..." >> /home/z/my-project/dev.log
        sleep 2
    done
' &

# Exit immediately
exit 0
