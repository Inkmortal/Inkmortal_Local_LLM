#!/bin/bash

# Seadragon LLM System Startup Manager
# This script manages and monitors all services required for the LLM system

set -e

PROJECT_DIR="/Users/seadragoninkmortal/Documents/Projects/Inkmortal_Local_LLM"
LOG_DIR="$PROJECT_DIR/logs"
SERVICES_STATUS_FILE="$LOG_DIR/services_status.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create logs directory
mkdir -p "$LOG_DIR"

# Function to check service status
check_service() {
    local service_name=$1
    local check_command=$2
    
    if eval "$check_command" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $service_name is running"
        echo "$service_name: RUNNING" >> "$SERVICES_STATUS_FILE"
        return 0
    else
        echo -e "${RED}✗${NC} $service_name is not running"
        echo "$service_name: NOT RUNNING" >> "$SERVICES_STATUS_FILE"
        return 1
    fi
}

# Function to start LaunchAgent
start_launch_agent() {
    local plist_path=$1
    local service_name=$2
    
    if [ -f "$plist_path" ]; then
        launchctl unload "$plist_path" 2>/dev/null || true
        launchctl load "$plist_path"
        echo -e "${GREEN}Started${NC} $service_name"
    else
        echo -e "${RED}Missing${NC} $service_name plist file"
    fi
}

echo "========================================="
echo "Seadragon LLM System Startup Manager"
echo "========================================="
echo ""

# Clear previous status file
> "$SERVICES_STATUS_FILE"
echo "Service Status Report - $(date)" >> "$SERVICES_STATUS_FILE"
echo "=========================================" >> "$SERVICES_STATUS_FILE"

# Check PostgreSQL
echo "Checking PostgreSQL..."
check_service "PostgreSQL" "pg_isready -h localhost -p 5432"

# Check RabbitMQ
echo "Checking RabbitMQ..."
check_service "RabbitMQ" "rabbitmqctl status"

# Check Ollama
echo "Checking Ollama..."
check_service "Ollama" "curl -s http://localhost:11434/api/tags"

# Check Nginx
echo "Checking Nginx..."
check_service "Nginx" "curl -s http://localhost:80 -o /dev/null -w '%{http_code}' | grep -E '200|301|302|404'"

# Check Backend
echo "Checking Backend API..."
check_service "Backend API" "curl -s http://localhost:8000/health"

# Check Frontend
echo "Checking Frontend..."
check_service "Frontend" "curl -s http://localhost:5173 -o /dev/null -w '%{http_code}' | grep -E '200|301|302'"

echo ""
echo "========================================="
echo "Service Status Summary"
echo "========================================="
cat "$SERVICES_STATUS_FILE"

# If any services are not running, offer to start them
if grep -q "NOT RUNNING" "$SERVICES_STATUS_FILE"; then
    echo ""
    echo -e "${YELLOW}Some services are not running.${NC}"
    echo "Would you like to start them? (y/n)"
    read -r response
    
    if [[ "$response" == "y" ]]; then
        # Start backend if needed
        if grep -q "Backend API: NOT RUNNING" "$SERVICES_STATUS_FILE"; then
            echo "Starting Backend API..."
            start_launch_agent "$HOME/Library/LaunchAgents/com.seadragon.llm.backend.plist" "Backend API"
        fi
        
        # Start frontend if needed
        if grep -q "Frontend: NOT RUNNING" "$SERVICES_STATUS_FILE"; then
            echo "Starting Frontend..."
            start_launch_agent "$HOME/Library/LaunchAgents/com.seadragon.llm.frontend.plist" "Frontend"
        fi
    fi
fi

echo ""
echo "Startup check complete!"
echo "Logs available at: $LOG_DIR"