# API Gateway Implementation

## Overview
This document outlines the implementation of the API Gateway, which serves as the central entry point for all client requests. The API Gateway handles routing, authentication, and request management. The implementation will be done in two phases: first, the basic functionality needed for the Admin Panel, and then the complete implementation including Ollama integration.

## Phase 1: Admin Panel Support

1. **Basic FastAPI Setup:**

   *Task Description:* Set up the basic FastAPI application structure with CORS support and include the authentication router. This provides the foundation for the API Gateway.

   ```python
   # backend/app/main.py
   from fastapi import FastAPI, Depends
   from fastapi.middleware.cors import CORSMiddleware
   from .auth.router import router as auth_router, get_current_active_user
   from .db import engine, Base

   # Create database tables
   Base.metadata.create_all(bind=engine)

   app = FastAPI()

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

   # Include the authentication router
   app.include_router(auth_router, prefix="/auth", tags=["authentication"])

   @app.get("/")
   async def root():
       return {"message": "Seadragon LLM Server"}
   ```

2. **Admin API Router:**

   *Task Description:* Create a router specifically for admin-related endpoints. This router will handle IP whitelist management, registration token generation, and API key management.

   ```python
   # backend/app/api/admin.py
   from fastapi import APIRouter, Depends, HTTPException
   from sqlalchemy.orm import Session
   from ..auth.router import get_current_active_user
   from ..auth.models import User, RegistrationToken
   from ..db import get_db
   from typing import List
   import uuid
   from datetime import datetime

   router = APIRouter()

   # IP Whitelist Management
   @router.get("/whitelist")
   async def get_whitelist(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
       # In a real implementation, this would fetch from a database
       # For now, we'll use a placeholder
       return ["127.0.0.1", "192.168.1.100"]

   @router.post("/whitelist")
   async def add_to_whitelist(ip: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
       # In a real implementation, this would add to a database
       return {"message": f"Added {ip} to whitelist"}

   @router.delete("/whitelist/{ip}")
   async def remove_from_whitelist(ip: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
       # In a real implementation, this would remove from a database
       return {"message": f"Removed {ip} from whitelist"}

   # Registration Token Management
   @router.post("/tokens")
   async def generate_token(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
       token = str(uuid.uuid4())
       db_token = RegistrationToken(token=token)
       db.add(db_token)
       db.commit()
       db.refresh(db_token)
       return {"token": token}

   @router.get("/tokens")
   async def list_tokens(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
       tokens = db.query(RegistrationToken).all()
       return tokens

   # API Key Management
   @router.post("/apikeys")
   async def create_api_key(name: str, priority: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
       # In a real implementation, this would create an API key in the database
       api_key = str(uuid.uuid4())
       return {"key": api_key, "name": name, "priority": priority}

   @router.get("/apikeys")
   async def list_api_keys(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
       # In a real implementation, this would fetch from a database
       return []

   @router.delete("/apikeys/{key}")
   async def revoke_api_key(key: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
       # In a real implementation, this would revoke the API key in the database
       return {"message": f"Revoked API key {key}"}
   ```

3. **Include Admin Router in Main App:**

   *Task Description:* Include the admin router in the main FastAPI application.

   ```python
   # backend/app/main.py (updated)
   from .api.admin import router as admin_router

   # ... (existing code)

   # Include the admin router
   app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
   ```

4. **API Key Model:**

   *Task Description:* Create a database model for API keys.

   ```python
   # backend/app/auth/models.py (updated)
   # ... (existing code)

   class APIKey(Base):
       __tablename__ = "api_keys"
       id = Column(Integer, primary_key=True)
       key = Column(String, unique=True)
       name = Column(String)  # Application name
       priority = Column(Integer)  # Custom priority level
       created_at = Column(DateTime, server_default=func.now())
       last_used = Column(DateTime)
       is_active = Column(Boolean, default=True)
   ```

5. **IP Whitelist Model:**

   *Task Description:* Create a database model for the IP whitelist.

   ```python
   # backend/app/auth/models.py (updated)
   # ... (existing code)

   class IPWhitelist(Base):
       __tablename__ = "ip_whitelist"
       id = Column(Integer, primary_key=True)
       ip = Column(String, unique=True)
       added_at = Column(DateTime, server_default=func.now())
   ```

6. **Update Admin API Router to Use Models:**

   *Task Description:* Update the admin router to use the database models for IP whitelist and API keys.

   ```python
   # backend/app/api/admin.py (updated)
   from ..auth.models import User, RegistrationToken, APIKey, IPWhitelist

   # ... (existing code)

   # IP Whitelist Management (updated)
   @router.get("/whitelist")
   async def get_whitelist(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
       whitelist = db.query(IPWhitelist).all()
       return [entry.ip for entry in whitelist]

   @router.post("/whitelist")
   async def add_to_whitelist(ip: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
       db_ip = IPWhitelist(ip=ip)
       db.add(db_ip)
       db.commit()
       return {"message": f"Added {ip} to whitelist"}

   @router.delete("/whitelist/{ip}")
   async def remove_from_whitelist(ip: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
       db_ip = db.query(IPWhitelist).filter(IPWhitelist.ip == ip).first()
       if db_ip:
           db.delete(db_ip)
           db.commit()
           return {"message": f"Removed {ip} from whitelist"}
       raise HTTPException(status_code=404, detail="IP not found in whitelist")

   # ... (existing code)

   # API Key Management (updated)
   @router.post("/apikeys")
   async def create_api_key(name: str, priority: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
       api_key = str(uuid.uuid4())
       db_key = APIKey(key=api_key, name=name, priority=priority)
       db.add(db_key)
       db.commit()
       db.refresh(db_key)
       return {"key": api_key, "name": name, "priority": priority}

   @router.get("/apikeys")
   async def list_api_keys(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
       keys = db.query(APIKey).all()
       return keys

   @router.delete("/apikeys/{key}")
   async def revoke_api_key(key: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
       db_key = db.query(APIKey).filter(APIKey.key == key).first()
       if db_key:
           db_key.is_active = False
           db.commit()
           return {"message": f"Revoked API key {key}"}
       raise HTTPException(status_code=404, detail="API key not found")
   ```

## Phase 2: Complete API Gateway (After Admin Panel Implementation)

7. **Request Source Identification:**

   *Task Description:* Create a utility function to identify the source of a request (Direct API, Custom App, or Web Chat) based on headers and IP address.

   ```python
   # backend/app/queue/utils.py
   from enum import Enum
   from fastapi import Request
   from sqlalchemy.orm import Session
   from ..auth.models import APIKey, IPWhitelist

   class RequestSource(Enum):
       DIRECT_API = 1    # Cline/Roo/etc (highest priority)
       CUSTOM_APP = 2    # Custom applications (configurable)
       WEB_CHAT = 3      # Browser interface (lowest priority)

   async def identify_request_source(request: Request, db: Session) -> tuple[RequestSource, int]:
       """Identify the source of a request and its priority."""
       # Check for API key in header
       api_key = request.headers.get("X-API-Key")
       if api_key:
           db_key = db.query(APIKey).filter(APIKey.key == api_key, APIKey.is_active == True).first()
           if db_key:
               # Update last used timestamp
               db_key.last_used = datetime.now()
               db.commit()
               return RequestSource.CUSTOM_APP, db_key.priority

       # Check if IP is whitelisted (for Direct API access)
       client_ip = request.client.host
       is_whitelisted = db.query(IPWhitelist).filter(IPWhitelist.ip == client_ip).first() is not None
       if is_whitelisted:
           return RequestSource.DIRECT_API, RequestSource.DIRECT_API.value

       # Default to Web Chat
       return RequestSource.WEB_CHAT, RequestSource.WEB_CHAT.value
   ```

8. **Queue Entry Model:**

   *Task Description:* Create a model for queue entries.

   ```python
   # backend/app/queue/models.py
   import uuid
   from datetime import datetime
   from .utils import RequestSource

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
   ```

9. **Ollama Proxy Endpoints:**

   *Task Description:* Create endpoints to proxy requests to Ollama. These will be implemented in detail in the Ollama Integration phase.

   ```python
   # backend/app/api/ollama.py
   from fastapi import APIRouter, Request, Depends
   from fastapi.responses import StreamingResponse
   from sqlalchemy.orm import Session
   from ..db import get_db
   from ..queue.utils import identify_request_source

   router = APIRouter()

   @router.get("/tags")
   async def list_models(request: Request, db: Session = Depends(get_db)):
       """Mirror Ollama's model listing endpoint"""
       # This will be implemented in the Ollama Integration phase
       return {"models": ["llama3:70b"]}

   @router.post("/{path}")
   async def proxy_ollama(path: str, request: Request, db: Session = Depends(get_db)):
       """Proxy ALL Ollama API endpoints through queue system"""
       # This will be implemented in the Ollama Integration phase
       return {"message": "Ollama proxy not yet implemented"}
   ```

10. **Include Ollama Router in Main App:**

    *Task Description:* Include the Ollama router in the main FastAPI application.

    ```python
    # backend/app/main.py (updated)
    from .api.ollama import router as ollama_router

    # ... (existing code)

    # Include the Ollama router
    app.include_router(ollama_router, prefix="/api/ollama", tags=["ollama"])
    ```

11. **System Stats Endpoint:**

    *Task Description:* Create an endpoint to provide system statistics for the admin panel.

    ```python
    # backend/app/api/admin.py (updated)
    # ... (existing code)

    @router.get("/stats")
    async def get_system_stats(current_user: User = Depends(get_current_active_user)):
        # This will be implemented in the Monitoring phase
        return {
            "queue_length": 0,
            "active_requests": 0,
            "requests_per_minute": 0,
            "average_wait_time": 0,
        }
    ```

12. **API Documentation:**

    *Task Description:* Configure Swagger UI for API documentation.

    ```python
    # backend/app/main.py (updated)
    # ... (existing code)

    app = FastAPI(
        title="Seadragon LLM API",
        description="API for the Seadragon LLM Server",
        version="0.1.0",
    )