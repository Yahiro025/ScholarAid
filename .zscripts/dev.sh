#!/bin/bash
# ScholarAId Dev Server Script
# Called by the container's /start.sh
# Uses production build for stability (dev server uses too much RAM)
# Uses daemonization (setsid + double-fork) to persist beyond parent session

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

# Step 3: Kill any existing Next.js server on port 3000
pkill -f "server.js" 2>/dev/null || true
sleep 1

# Step 4: Start production server as a detached daemon
# Uses setsid to create a new session so the process survives
# when the parent shell session ends (e.g., bash tool timeout)
echo "[$(date)] Starting production server as daemon..." >> "$LOGFILE"

setsid bash -c '
  cd /home/z/my-project
  while true; do
    PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js >> /home/z/my-project/dev.log 2>&1
    echo "[$(date)] Server exited, restarting in 3s..." >> /home/z/my-project/dev.log
    sleep 3
  done
' &

# Give the server a moment to start
sleep 2

echo "[$(date)] Daemon launched, dev.sh exiting." >> "$LOGFILE"
