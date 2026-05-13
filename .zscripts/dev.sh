#!/bin/bash
# ScholarAId Dev Server Script
# Called by the container's /start.sh
# Uses production build for stability (dev server uses too much RAM)

cd /home/z/my-project

LOGFILE="/home/z/my-project/dev.log"
echo "[$(date)] ScholarAId dev.sh starting..." >> "$LOGFILE"

# Step 1: Ensure database is set up
echo "[$(date)] Setting up database..." >> "$LOGFILE"
bun run db:push >> "$LOGFILE" 2>&1 || true

# Step 2: Build production bundle if needed
if [ ! -d ".next/standalone" ] || [ ! -f ".next/standalone/server.js" ]; then
  echo "[$(date)] Building production bundle..." >> "$LOGFILE"
  bun run build >> "$LOGFILE" 2>&1
fi

# Step 3: Run production server with auto-restart
# Trap signals to survive process cleanup
trap '' SIGHUP SIGTERM

echo "[$(date)] Starting production server with auto-restart..." >> "$LOGFILE"

while true; do
  echo "[$(date)] Starting Next.js server..." >> "$LOGFILE"
  PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js >> "$LOGFILE" 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 2s..." >> "$LOGFILE"
  sleep 2
done
