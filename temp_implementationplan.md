# Local LLM Server Implementation Guide

## System Overview

This system provides:
- Transparent Ollama API proxy with queue management
- Web interface for chat
- Admin panel for system management
- Priority-based request handling
- IP whitelisting for direct API access

## Core Components Implementation

### 1. Ollama Proxy and Queue Manager

```python
# backend/app/queue/manager.py
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
import httpx
import asyncio
from datetime import datetime
from enum import Enum
from typing import AsyncGenerator, Optional
import json

class RequestSource(Enum):
    DIRECT_API = 1    # Cline/Roo/etc (default)
    CUSTOM_APP = 2    # Your applications (customizable)
    WEB_CHAT = 3      # Browser interface

class APIKey(Base):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True)
    name = Column(String)  # Application name
    priority = Column(Integer)  # Custom priority level
    created_at = Column(DateTime)
    last_used = Column(DateTime)
    is_active = Column(Boolean, default=True)

class QueueEntry:
    def __init__(self, source: RequestSource, path: str, data: dict, custom_priority: int = None):
        self.id = str(uuid.uuid4())
        self.source = source
        self.path = path
        self.data = data
        self.timestamp = datetime.now()
        self.base_priority = custom_priority if custom_priority is not None else source.value
    
    @property
    def priority(self) -> float:
        # Age factor: Reduce priority number (increase actual priority) 
        # by 0.1 for every minute waiting
        wait_time = (datetime.now() - self.timestamp).total_seconds() / 60
        return self.base_priority - (wait_time * 0.1)

class QueueManager:
    def __init__(self):
        self.queue = []
        self.processing = False
        self.ollama_client = httpx.AsyncClient(base_url="http://localhost:11434")
        self.ip_whitelist = set()  # For direct API access
    
    def add_to_whitelist(self, ip: str):
        self.ip_whitelist.add(ip)
    
    def remove_from_whitelist(self, ip: str):
        self.ip_whitelist.discard(ip)
    
    def is_whitelisted(self, ip: str) -> bool:
        return ip in self.ip_whitelist
    
    async def add_request(self, path: str, data: dict, source: RequestSource, 
                         client_ip: Optional[str] = None) -> AsyncGenerator:
        # IP whitelist check for direct API access
        if source == RequestSource.DIRECT_API and client_ip and not self.is_whitelisted(client_ip):
            yield json.dumps({"error": "IP not whitelisted"}).encode()
            return

        entry = QueueEntry(source, path, data)
        
        # Wait if we're processing and there are higher priority requests
        while self.processing or (self.queue and self.queue[0].priority < entry.priority):
            await asyncio.sleep(0.1)
        
        self.processing = True
        try:
            # Forward to real Ollama and stream response
            async with self.ollama_client.stream("POST", f"/api/{path}", json=data) as response:
                async for chunk in response.aiter_bytes():
                    yield chunk
        finally:
            self.processing = False

# backend/app/main.py
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI()
queue_manager = QueueManager()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://chat.seadragoninkmortal.com",
        "https://admin.seadragoninkmortal.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_request_priority(request: Request) -> tuple[RequestSource, int]:
    """Determine request source and priority based on headers and API keys"""
    api_key = request.headers.get("X-API-Key")
    if api_key:
        # Check for custom API key priority
        db_key = await APIKey.get(key=api_key)
        if db_key and db_key.is_active:
            # Update last used timestamp
            db_key.last_used = datetime.now()
            await db_key.save()
            return RequestSource.CUSTOM_APP, db_key.priority
    
    # Check if it's direct API access (Cline/Roo)
    if request.url.path.startswith("/api/"):
        return RequestSource.DIRECT_API, RequestSource.DIRECT_API.value
    
    return RequestSource.WEB_CHAT, RequestSource.WEB_CHAT.value

@app.get("/api/tags")
async def list_models(request: Request):
    """Mirror Ollama's model listing endpoint"""
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:11434/api/tags")
        return response.json()

@app.post("/api/{path}")
async def proxy_ollama(path: str, request: Request):
    """Proxy ALL Ollama API endpoints through queue system"""
    data = await request.json()
    source = get_source(request)
    client_ip = request.client.host
    
    return StreamingResponse(
        queue_manager.add_request(path, data, source, client_ip),
        media_type="text/event-stream"
    )
```

### 2. Authentication Service

```python
# backend/app/auth/models.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    password_hash = Column(String)
    is_admin = Column(Boolean, default=False)
    registration_token = Column(String)
    created_at = Column(DateTime)

class RegistrationToken(Base):
    __tablename__ = "registration_tokens"
    id = Column(Integer, primary_key=True)
    token = Column(String, unique=True)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime)

# backend/app/auth/router.py
from fastapi import APIRouter, Depends, HTTPException
from .models import User, RegistrationToken
from .utils import create_jwt_token, get_password_hash, verify_password

router = APIRouter()

@router.post("/register")
async def register(username: str, password: str, token: str):
    # Validate registration token
    db_token = await RegistrationToken.get(token=token, used=False)
    if not db_token:
        raise HTTPException(status_code=400, detail="Invalid token")
    
    # Create user
    user = User(
        username=username,
        password_hash=get_password_hash(password),
        registration_token=token
    )
    await user.save()
    
    # Mark token as used
    db_token.used = True
    await db_token.save()
    
    return {"access_token": create_jwt_token(user.id)}
```

### 3. Admin Panel Interface

```typescript
// frontend/src/pages/Admin.tsx
import React from 'react';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

export function AdminPanel() {
  const [newIP, setNewIP] = useState('');
  
  const { data: whitelist } = useQuery({
    queryKey: ['whitelist'],
    queryFn: () => fetch('/api/admin/whitelist').then(r => r.json())
  });
  
  const addToWhitelist = useMutation({
    mutationFn: (ip: string) => 
      fetch('/api/admin/whitelist', {
        method: 'POST',
        body: JSON.stringify({ ip })
      }),
    onSuccess: () => {
      setNewIP('');
      // Refresh whitelist
    }
  });
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      
      {/* IP Whitelist Management */}
      <div className="mb-8">
        <h2 className="text-xl mb-2">IP Whitelist</h2>
        <div className="flex gap-2 mb-4">
          <input
            value={newIP}
            onChange={e => setNewIP(e.target.value)}
            className="border p-2 rounded"
            placeholder="Enter IP address"
          />
          <button
            onClick={() => addToWhitelist.mutate(newIP)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Add IP
          </button>
        </div>
        
        <ul className="space-y-2">
          {whitelist?.map(ip => (
            <li key={ip} className="flex justify-between items-center">
              <span>{ip}</span>
              <button
                onClick={() => removeFromWhitelist.mutate(ip)}
                className="text-red-500"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Registration Token Management */}
      {/* Queue Monitoring */}
      {/* System Statistics */}
    </div>
  );
}
```

## Deployment Steps

1. **Initial Setup**
```bash
# Install required software
brew install ollama
brew install nginx
brew install node
brew install postgresql

# Install pnpm
npm install -g pnpm

# Create project structure
mkdir -p seadragoninkmortal/{backend,frontend,nginx}
```

2. **Backend Setup**
```bash
cd seadragoninkmortal/backend
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn sqlalchemy psycopg2-binary httpx python-jose[cryptography]
```

3. **Frontend Setup**
```bash
cd seadragoninkmortal/frontend
pnpm create vite . --template react-ts
pnpm install
```

4. **Nginx Configuration**
```nginx
# nginx/nginx.conf
http {
    server {
        listen 80;
        server_name local-llm.seadragoninkmortal.com;

        location / {
            proxy_pass http://localhost:8000;  # FastAPI proxy
            proxy_http_version 1.1;
            proxy_set_header Connection '';
            proxy_buffering off;
            proxy_cache off;
            proxy_read_timeout 24h;
        }
    }

    server {
        listen 80;
        server_name chat.seadragoninkmortal.com;
        
        location / {
            proxy_pass http://localhost:3000;  # React app
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
        }
    }
}
```

5. **Cloudflare Tunnel Setup**
```yaml
# ~/.cloudflared/config.yml
tunnel: <your-tunnel-id>
credentials-file: /Users/<your-user>/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: local-llm.seadragoninkmortal.com
    service: http://localhost:80
  - hostname: chat.seadragoninkmortal.com
    service: http://localhost:80
  - hostname: admin.seadragoninkmortal.com
    service: http://localhost:80
  - service: http_status:404
```

## Usage Instructions

1. **For Cline/Roo:**
   - Set server URL to: `https://local-llm.seadragoninkmortal.com/api/code`
   - Ensure IP is whitelisted in admin panel

2. **For Custom Applications:**
```python
import requests

response = requests.post(
    "https://local-llm.seadragoninkmortal.com/api/chat",
    headers={"X-API-Key": "your-app-key"},
    json={"messages": [...]}
)
```

3. **For Web Interface:**
   - Users visit: `https://chat.seadragoninkmortal.com`
   - Register with admin-provided token
   - Use chat interface

Would you like me to focus on any particular component or add more details to any section?