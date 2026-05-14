#!/bin/bash
trap 'echo "$(date): Received signal $?" >> /home/z/my-project/server-trap.log' EXIT TERM INT HUP KILL
cd /home/z/my-project
NODE_OPTIONS="--max-old-space-size=512" node .next/standalone/server.js
echo "$(date): Server exited with code $?" >> /home/z/my-project/server-trap.log
