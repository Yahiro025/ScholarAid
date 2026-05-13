#!/bin/bash
# Persistent keep-alive script that runs the dev server
# This script writes its PID so it can be monitored

PIDFILE="/home/z/my-project/.zscripts/dev.pid"
LOGFILE="/home/z/my-project/dev.log"

cd /home/z/my-project

echo $$ > "$PIDFILE"
echo "[$(date)] keep-alive.sh started with PID $$" >> "$LOGFILE"

while true; do
  echo "[$(date)] Starting Next.js server..." >> "$LOGFILE"
  
  # Start the server
  node .next/standalone/server.js >> "$LOGFILE" 2>&1 &
  SERVER_PID=$!
  echo $SERVER_PID > /home/z/my-project/.zscripts/server.pid
  echo "[$(date)] Server started with PID $SERVER_PID" >> "$LOGFILE"
  
  # Wait for the server to exit
  wait $SERVER_PID 2>/dev/null
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 2s..." >> "$LOGFILE"
  sleep 2
done
