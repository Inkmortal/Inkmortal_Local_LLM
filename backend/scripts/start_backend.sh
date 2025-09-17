#!/bin/bash

# Seadragon LLM Backend Startup Script
# This script starts the FastAPI backend server

# Set working directory
BACKEND_DIR="/Users/seadragoninkmortal/Documents/Projects/Inkmortal_Local_LLM/backend"
LOG_DIR="$BACKEND_DIR/logs"
PYTHON_PATH="/usr/bin/python3"  # Adjust if using different Python

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Log startup
echo "[$(date)] Starting Seadragon LLM Backend..." >> "$LOG_DIR/startup.log"

# Change to backend directory
cd "$BACKEND_DIR"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
    PYTHON_PATH="venv/bin/python"
fi

# Wait for PostgreSQL and RabbitMQ to be ready
echo "[$(date)] Waiting for services..." >> "$LOG_DIR/startup.log"
sleep 10

# Check if PostgreSQL is running
until pg_isready -h localhost -p 5432 2>/dev/null; do
    echo "[$(date)] Waiting for PostgreSQL..." >> "$LOG_DIR/startup.log"
    sleep 2
done

# Check if RabbitMQ is running
until rabbitmqctl status >/dev/null 2>&1; do
    echo "[$(date)] Waiting for RabbitMQ..." >> "$LOG_DIR/startup.log"
    sleep 2
done

# Check if Ollama is running, start if not
if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "[$(date)] Starting Ollama..." >> "$LOG_DIR/startup.log"
    ollama serve >> "$LOG_DIR/ollama.log" 2>&1 &
    sleep 5
fi

# Start the FastAPI backend
echo "[$(date)] Starting FastAPI server..." >> "$LOG_DIR/startup.log"
exec $PYTHON_PATH -m uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --log-level info \
    >> "$LOG_DIR/backend.log" 2>&1