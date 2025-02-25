# Ollama Integration Implementation

## Overview
This document outlines the steps to integrate Ollama into the Seadragon LLM system. This includes setting up Ollama, creating a proxy service to forward requests to Ollama, and implementing the queue manager to prioritize requests.

## Steps

1. **Ollama Installation and Setup:**

   *Task Description:* Install Ollama using Homebrew and pull the Llama 3 70B model. This provides the foundation for LLM capabilities.

   ```bash
   # Install Ollama
   brew install ollama

   # Start Ollama service
   brew services start ollama

   # Pull Llama 3 70B model
   ollama pull llama3:70b
   ```

2. **Queue Manager Implementation:**

   *Task Description:* Create a queue manager class that will handle prioritizing requests to Ollama. This is a critical component that ensures high-priority requests (like those from coding tools) are processed before lower-priority requests.

   ```python
   # backend/app/queue/manager.py
   import httpx
   import asyncio
   from datetime import datetime
   from typing import AsyncGenerator, Optional, Dict, List
   import json
   from .models import QueueEntry
   from .utils import RequestSource
   from sqlalchemy.orm import Session
   from ..auth.models import IPWhitelist

   class QueueManager:
       def __init__(self):
           self.queue: List[QueueEntry] = []
           self.processing = False
           self.ollama_client = httpx.AsyncClient(base_url="http://localhost:11434")
       
       async def add_request(self, path: str, data: dict, source: RequestSource, 
                           priority: int, client_ip: Optional[str] = None,
                           db: Session = None) -> AsyncGenerator:
           """Add a request to the queue and process it when it's turn comes."""
           # IP whitelist check for direct API access
           if source == RequestSource.DIRECT_API and client_ip and db:
               is_whitelisted = db.query(IPWhitelist).filter(IPWhitelist.ip == client_ip).first() is not None
               if not is_whitelisted:
                   yield json.dumps({"error": "IP not whitelisted"}).encode()
                   return

           # Create queue entry
           entry = QueueEntry(source, path, data, priority)
           self.queue.append(entry)
           
           # Sort queue by priority (lower number = higher priority)
           self.queue.sort(key=lambda x: x.priority)
           
           # Wait if we're processing and there are higher priority requests
           while self.processing or (self.queue and self.queue[0].id != entry.id):
               await asyncio.sleep(0.1)
           
           # Remove from queue and mark as processing
           self.queue.remove(entry)
           self.processing = True
           
           try:
               # Forward to real Ollama and stream response
               async with self.ollama_client.stream("POST", f"/api/{path}", json=data) as response:
                   async for chunk in response.aiter_bytes():
                       yield chunk
           finally:
               self.processing = False
   ```

3. **Ollama API Proxy Implementation:**

   *Task Description:* Implement the Ollama API proxy endpoints in the FastAPI application. These endpoints will forward requests to Ollama through the queue manager.

   ```python
   # backend/app/api/ollama.py (updated)
   from fastapi import APIRouter, Request, Depends, HTTPException
   from fastapi.responses import StreamingResponse
   from sqlalchemy.orm import Session
   from ..db import get_db
   from ..queue.utils import identify_request_source
   from ..queue.manager import QueueManager
   import httpx
   import json

   router = APIRouter()
   queue_manager = QueueManager()

   @router.get("/tags")
   async def list_models(request: Request, db: Session = Depends(get_db)):
       """Mirror Ollama's model listing endpoint"""
       try:
           async with httpx.AsyncClient() as client:
               response = await client.get("http://localhost:11434/api/tags")
               return response.json()
       except Exception as e:
           raise HTTPException(status_code=500, detail=f"Error communicating with Ollama: {str(e)}")

   @router.post("/{path}")
   async def proxy_ollama(path: str, request: Request, db: Session = Depends(get_db)):
       """Proxy ALL Ollama API endpoints through queue system"""
       try:
           # Parse request body
           data = await request.json()
           
           # Identify request source and priority
           source, priority = await identify_request_source(request, db)
           
           # Get client IP
           client_ip = request.client.host
           
           # Add to queue and stream response
           return StreamingResponse(
               queue_manager.add_request(path, data, source, priority, client_ip, db),
               media_type="text/event-stream"
           )
       except json.JSONDecodeError:
           raise HTTPException(status_code=400, detail="Invalid JSON")
       except Exception as e:
           raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
   ```

4. **Update Main FastAPI Application:**

   *Task Description:* Update the main FastAPI application to include the Ollama router and initialize the queue manager.

   ```python
   # backend/app/main.py (updated)
   from fastapi import FastAPI, Depends
   from fastapi.middleware.cors import CORSMiddleware
   from .auth.router import router as auth_router, get_current_active_user
   from .api.admin import router as admin_router
   from .api.ollama import router as ollama_router
   from .db import engine, Base

   # Create database tables
   Base.metadata.create_all(bind=engine)

   app = FastAPI(
       title="Seadragon LLM API",
       description="API for the Seadragon LLM Server",
       version="0.1.0",
   )

   # CORS setup
   app.add_middleware(
       CORSMiddleware,
       allow_origins=[
           "https://chat.seadragoninkmortal.com",
           "https://admin.seadragoninkmortal.com",
           "http://localhost:3000"  # For local development
       ],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )

   # Include routers
   app.include_router(auth_router, prefix="/auth", tags=["authentication"])
   app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
   app.include_router(ollama_router, prefix="/api/ollama", tags=["ollama"])

   @app.get("/")
   async def root():
       return {"message": "Seadragon LLM Server"}
   ```

5. **Queue Monitoring Endpoints:**

   *Task Description:* Create endpoints to monitor the queue status. These will be used by the admin panel to display queue information.

   ```python
   # backend/app/api/admin.py (updated)
   # ... (existing code)

   @router.get("/queue")
   async def get_queue_status(current_user: User = Depends(get_current_active_user)):
       """Get the current queue status"""
       from ..api.ollama import queue_manager
       
       queue_entries = [
           {
               "id": entry.id,
               "source": entry.source.name,
               "priority": entry.priority,
               "wait_time": (datetime.now() - entry.timestamp).total_seconds(),
           }
           for entry in queue_manager.queue
       ]
       
       return {
           "queue_length": len(queue_manager.queue),
           "processing": queue_manager.processing,
           "entries": queue_entries,
       }
   ```

6. **Testing Ollama Integration:**

   *Task Description:* Create a simple test script to verify that the Ollama integration is working correctly. This script will send requests to the API Gateway and check that they are properly forwarded to Ollama.

   ```python
   # scripts/test_ollama.py
   import requests
   import json

   def test_models():
       """Test listing models"""
       response = requests.get("http://localhost:8000/api/ollama/tags")
       print("Models:", json.dumps(response.json(), indent=2))

   def test_chat():
       """Test chat completion"""
       data = {
           "model": "llama3:70b",
           "messages": [
               {"role": "user", "content": "Hello, how are you?"}
           ]
       }
       response = requests.post(
           "http://localhost:8000/api/ollama/chat",
           json=data,
           stream=True,
       )
       
       print("Chat response:")
       for chunk in response.iter_lines():
           if chunk:
               print(chunk.decode())

   if __name__ == "__main__":
       test_models()
       test_chat()
   ```

7. **Ollama Configuration:**

   *Task Description:* Create a configuration file for Ollama to customize its behavior, such as setting the number of threads to use.

   ```bash
   # Create Ollama configuration directory
   mkdir -p ~/.ollama

   # Create Ollama configuration file
   cat > ~/.ollama/config.json << EOF
   {
     "gpu_layers": -1,
     "num_thread": 8
   }
   EOF
   ```

8. **Error Handling:**

   *Task Description:* Implement robust error handling for Ollama requests. This ensures that the system can gracefully handle issues with Ollama.

   ```python
   # backend/app/queue/manager.py (updated)
   # ... (existing code)

   async def add_request(self, path: str, data: dict, source: RequestSource, 
                       priority: int, client_ip: Optional[str] = None,
                       db: Session = None) -> AsyncGenerator:
       """Add a request to the queue and process it when it's turn comes."""
       # ... (existing code)
       
       try:
           # Forward to real Ollama and stream response
           try:
               async with self.ollama_client.stream("POST", f"/api/{path}", json=data) as response:
                   if response.status_code >= 400:
                       error_data = await response.json()
                       yield json.dumps({
                           "error": f"Ollama error: {error_data.get('error', 'Unknown error')}",
                           "status_code": response.status_code
                       }).encode()
                   else:
                       async for chunk in response.aiter_bytes():
                           yield chunk
           except httpx.RequestError as e:
               yield json.dumps({
                   "error": f"Error communicating with Ollama: {str(e)}",
                   "status_code": 500
               }).encode()
       finally:
           self.processing = False
   ```

9. **Ollama Health Check:**

   *Task Description:* Implement a health check endpoint to verify that Ollama is running and responsive.

   ```python
   # backend/app/api/ollama.py (updated)
   # ... (existing code)

   @router.get("/health")
   async def health_check():
       """Check if Ollama is running and responsive"""
       try:
           async with httpx.AsyncClient() as client:
               response = await client.get("http://localhost:11434/api/tags", timeout=5.0)
               if response.status_code == 200:
                   return {"status": "healthy"}
               return {"status": "unhealthy", "reason": f"Ollama returned status code {response.status_code}"}
       except Exception as e:
           return {"status": "unhealthy", "reason": str(e)}