#!/bin/bash

# Seadragon LLM Frontend Startup Script
# This script starts the React development server

# Set working directory
FRONTEND_DIR="/Users/seadragoninkmortal/Documents/Projects/Inkmortal_Local_LLM/frontend"
LOG_DIR="$FRONTEND_DIR/logs"
NODE_PATH="/usr/local/bin/node"  # Adjust based on your node installation

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Log startup
echo "[$(date)] Starting Seadragon LLM Frontend..." >> "$LOG_DIR/startup.log"

# Change to frontend directory
cd "$FRONTEND_DIR"

# Check if node_modules exists, install if not
if [ ! -d "node_modules" ]; then
    echo "[$(date)] Installing dependencies..." >> "$LOG_DIR/startup.log"
    npm install >> "$LOG_DIR/install.log" 2>&1
fi

# Wait for backend to be ready
echo "[$(date)] Waiting for backend..." >> "$LOG_DIR/startup.log"
until curl -s http://localhost:8000/health >/dev/null 2>&1; do
    echo "[$(date)] Backend not ready, waiting..." >> "$LOG_DIR/startup.log"
    sleep 5
done

# Start the React dev server
echo "[$(date)] Starting React dev server..." >> "$LOG_DIR/startup.log"
exec npm run dev >> "$LOG_DIR/frontend.log" 2>&1