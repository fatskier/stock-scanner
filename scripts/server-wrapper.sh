#!/bin/bash
# Spawned by the Stock Scanner.app launcher with the launcher's PID as $1.
# Starts `npm run dev` and watches the parent: if the launcher app exits
# (Stop clicked, Cmd+Q, force-quit, crash), this wrapper kills the dev
# server and frees port 3000.

set -u

PARENT_PID="${1:?missing parent PID}"
SCANNER_DIR="${2:-/Users/cook/Claude/stock-scanner}"
PORT="${3:-3000}"
LOG="${4:-/tmp/stock-scanner.log}"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH}"

cd "$SCANNER_DIR" || { echo "[wrapper] cd $SCANNER_DIR failed" >> "$LOG"; exit 1; }

echo "[wrapper] $(date) starting npm run dev (parent=$PARENT_PID)" >> "$LOG"
npm run dev >> "$LOG" 2>&1 &
NPM_PID=$!

cleanup() {
  echo "[wrapper] $(date) cleanup: killing npm $NPM_PID and port $PORT holders" >> "$LOG"
  kill -TERM "$NPM_PID" 2>/dev/null || true
  pkill -TERM -P "$NPM_PID" 2>/dev/null || true
  # Final sweep — anything still bound to the port
  lsof -ti tcp:"$PORT" 2>/dev/null | xargs -r kill -TERM 2>/dev/null || true
  sleep 1
  lsof -ti tcp:"$PORT" 2>/dev/null | xargs -r kill -KILL 2>/dev/null || true
  exit 0
}
trap cleanup TERM INT HUP

# Watch parent + child. Exit when either is gone.
while true; do
  if ! kill -0 "$PARENT_PID" 2>/dev/null; then
    cleanup
  fi
  if ! kill -0 "$NPM_PID" 2>/dev/null; then
    echo "[wrapper] $(date) npm exited on its own" >> "$LOG"
    exit 0
  fi
  sleep 2
done
