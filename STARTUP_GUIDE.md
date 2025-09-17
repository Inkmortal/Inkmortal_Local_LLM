# Seadragon LLM System - Auto-Startup Guide

## Overview
This guide explains how to configure automatic startup for all Seadragon LLM services on macOS.

## Current Service Configuration

### Services Already Auto-Starting (via Homebrew)
- ✅ **PostgreSQL 15** - Database server
- ✅ **RabbitMQ** - Message queue system  
- ✅ **Nginx** - Reverse proxy server

### New Auto-Start Services Created
- **Backend API** - FastAPI server (Python)
- **Frontend** - React development server (Node.js)

## Installation Steps

### 1. Enable Auto-Start for Backend and Frontend

```bash
# Load the backend LaunchAgent
launchctl load ~/Library/LaunchAgents/com.seadragon.llm.backend.plist

# Load the frontend LaunchAgent
launchctl load ~/Library/LaunchAgents/com.seadragon.llm.frontend.plist
```

### 2. Ensure Nginx Auto-Starts (if not already)

```bash
brew services start nginx
```

### 3. Ensure Ollama is Available

Ollama should be installed and the backend startup script will automatically start it if needed.

## Managing Services

### Check Service Status

```bash
# Run the startup manager to see all services
~/Documents/Projects/Inkmortal_Local_LLM/scripts/startup_manager.sh

# Check individual services
launchctl list | grep seadragon
brew services list
```

### Start Services Manually

```bash
# Backend
launchctl load ~/Library/LaunchAgents/com.seadragon.llm.backend.plist

# Frontend  
launchctl load ~/Library/LaunchAgents/com.seadragon.llm.frontend.plist
```

### Stop Services

```bash
# Backend
launchctl unload ~/Library/LaunchAgents/com.seadragon.llm.backend.plist

# Frontend
launchctl unload ~/Library/LaunchAgents/com.seadragon.llm.frontend.plist

# Nginx
brew services stop nginx

# PostgreSQL
brew services stop postgresql@15

# RabbitMQ
brew services stop rabbitmq
```

### Restart Services

```bash
# Backend
launchctl unload ~/Library/LaunchAgents/com.seadragon.llm.backend.plist
launchctl load ~/Library/LaunchAgents/com.seadragon.llm.backend.plist

# Frontend
launchctl unload ~/Library/LaunchAgents/com.seadragon.llm.frontend.plist  
launchctl load ~/Library/LaunchAgents/com.seadragon.llm.frontend.plist
```

## Log Files

All services write logs to help with debugging:

- **Backend Logs**: `~/Documents/Projects/Inkmortal_Local_LLM/backend/logs/`
  - `backend.log` - Application logs
  - `backend.stdout.log` - Standard output
  - `backend.stderr.log` - Error output
  - `startup.log` - Startup sequence logs

- **Frontend Logs**: `~/Documents/Projects/Inkmortal_Local_LLM/frontend/logs/`
  - `frontend.log` - Application logs
  - `frontend.stdout.log` - Standard output
  - `frontend.stderr.log` - Error output
  - `startup.log` - Startup sequence logs

- **Service Status**: `~/Documents/Projects/Inkmortal_Local_LLM/logs/services_status.txt`

## Troubleshooting

### Service Won't Start

1. Check the logs in the respective log directories
2. Ensure all dependencies are installed:
   ```bash
   # Backend
   cd ~/Documents/Projects/Inkmortal_Local_LLM/backend
   pip install -r requirements.txt
   
   # Frontend
   cd ~/Documents/Projects/Inkmortal_Local_LLM/frontend
   npm install
   ```

3. Verify paths in the plist files are correct
4. Check for port conflicts:
   ```bash
   lsof -i :8000  # Backend port
   lsof -i :5173  # Frontend port
   ```

### Viewing Real-Time Logs

```bash
# Backend logs
tail -f ~/Documents/Projects/Inkmortal_Local_LLM/backend/logs/backend.log

# Frontend logs  
tail -f ~/Documents/Projects/Inkmortal_Local_LLM/frontend/logs/frontend.log
```

### Reset Everything

```bash
# Unload all services
launchctl unload ~/Library/LaunchAgents/com.seadragon.llm.backend.plist
launchctl unload ~/Library/LaunchAgents/com.seadragon.llm.frontend.plist

# Remove plist files (if needed)
rm ~/Library/LaunchAgents/com.seadragon.llm.*.plist

# Reload and start fresh
launchctl load ~/Library/LaunchAgents/com.seadragon.llm.backend.plist
launchctl load ~/Library/LaunchAgents/com.seadragon.llm.frontend.plist
```

## Service Dependencies

The startup scripts handle dependencies automatically:

1. **Backend** waits for:
   - PostgreSQL to be ready
   - RabbitMQ to be running
   - Starts Ollama if not running

2. **Frontend** waits for:
   - Backend API to be healthy
   - Installs npm dependencies if missing

## Access Points After Startup

Once all services are running:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **RabbitMQ Management**: http://localhost:15672 (if management plugin enabled)

## Note on Production

This setup is for development. For production deployment:
- Use proper process managers (systemd, supervisor)
- Run frontend build instead of dev server
- Use production-grade ASGI server settings
- Implement proper SSL/TLS certificates
- Configure firewall rules appropriately