import logging
import json
from typing import Dict, Any, Optional, AsyncGenerator
import asyncio
import httpx
from datetime import datetime

from ..models import QueuedRequest, QueueStats

# Configure logging
logger = logging.getLogger("rabbitmq_processor")

class RequestProcessor:
    """Handles request processing and streaming"""
    
    def __init__(self, ollama_url: str):
        self.ollama_url = ollama_url
        self.current_request: Optional[QueuedRequest] = None
        self.stats = QueueStats()
    
    async def process_request(self, request: QueuedRequest) -> Dict[str, Any]:
        """Process a request synchronously"""
        self.current_request = request
        self.current_request.status = "processing"
        self.current_request.processing_start = datetime.utcnow()
        
        try:
            # Forward to Ollama
            endpoint = request.endpoint.replace("/api", "")
            url = f"{self.ollama_url}{endpoint}"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=request.body,
                    timeout=60.0
                )
                
                # Update request status
                self.current_request.status = "completed"
                self.current_request.processing_end = datetime.utcnow()
                
                # Update statistics
                self._update_stats(self.current_request)
                
                # Get response data
                response_data = response.json()
                
                # Clear current request
                self.current_request = None
                
                return response_data
        
        except Exception as e:
            if self.current_request:
                self.current_request.status = "failed"
                self.current_request.error = str(e)
                self.current_request.processing_end = datetime.utcnow()
                self.stats.failed_requests += 1
                self.current_request = None
            
            raise
    
    async def process_streaming_request(
        self,
        request: QueuedRequest
    ) -> AsyncGenerator[str, None]:
        """Process a streaming request"""
        self.current_request = request
        self.current_request.status = "processing"
        self.current_request.processing_start = datetime.utcnow()
        
        try:
            endpoint = request.endpoint.replace("/api", "")
            url = f"{self.ollama_url}{endpoint}"
            
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST",
                    url,
                    json=request.body,
                    timeout=300.0
                ) as response:
                    async for chunk in response.aiter_text():
                        yield chunk
                
                # Update request status
                self.current_request.status = "completed"
                self.current_request.processing_end = datetime.utcnow()
                
                # Update statistics
                self._update_stats(self.current_request)
                
                # Clear current request
                self.current_request = None
        
        except Exception as e:
            if self.current_request:
                self.current_request.status = "failed"
                self.current_request.error = str(e)
                self.current_request.processing_end = datetime.utcnow()
                self.stats.failed_requests += 1
                self.current_request = None
            
            yield json.dumps({"error": str(e)})
    
    def _update_stats(self, request: QueuedRequest) -> None:
        """Update statistics from completed request"""
        if not request.processing_start or not request.processing_end:
            return
        
        wait_time = (request.processing_start - request.timestamp).total_seconds()
        processing_time = (request.processing_end - request.processing_start).total_seconds()
        
        self.stats.update_timing(wait_time, processing_time)