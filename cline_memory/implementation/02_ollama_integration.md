# Ollama Integration Implementation

## Overview
This document outlines the steps to integrate Ollama into the Seadragon LLM system. This includes setting up Ollama, creating a proxy service to forward requests to Ollama, and implementing the queue manager to prioritize requests.

## Steps

1. **Ollama Installation and Setup:**

   *Task Description:* Install Ollama using Homebrew and pull the Llama 3.3 70B model. This provides the foundation for LLM capabilities.

   ```bash
   # Install Ollama
   brew install ollama

   # Start Ollama service
   brew services start ollama

   # Pull Llama 3.3 70B model
   ollama pull llama3.3:70b
   ```

2. **RabbitMQ Queue System Implementation:**

   *Task Description:* Implement a robust, component-based queue system using RabbitMQ to manage request prioritization and processing. This ensures high-priority requests (like those from direct API calls) are processed before lower-priority requests (like web interface calls).

   The implementation is separated into distinct components:

   - **Connection Management:** Handles establishing and maintaining connections to RabbitMQ
   - **Exchange Management:** Configures and manages RabbitMQ exchanges
   - **Queue Management:** Sets up priority queues and handles message routing
   - **Aging System:** Implements request aging to prevent starvation using dead letter exchanges
   - **Request Processing:** Handles the actual processing of requests to Ollama

   Key features include:
   - Priority-based request queuing
   - Request aging to prevent starvation of low-priority requests
   - Error handling and recovery
   - Connection management with proper startup/shutdown hooks
   - Process locking to prevent race conditions

3. **API Gateway Integration:**

   *Task Description:* Update the API Gateway to use the RabbitMQ queue manager for routing requests to Ollama. This ensures that all requests go through the priority-based queue system.

   ```python
   # backend/app/api/gateway.py (excerpt)
   @router.post("/chat/completions")
   async def chat_completions(
       request: Request,
       priority_data: Dict[str, Any] = Depends(get_request_priority),
       db: Session = Depends(get_db)
   ):
       """
       Proxy endpoint for Ollama chat completions API
       Compatible with OpenAI API format
       """
       # Get request body
       body = await request.json()
       
       # Extract model from request
       model = body.get("model", "llama3.3:70b")
       
       # Create a request object for the queue
       request_obj = QueuedRequest(
           priority=priority_data["priority"],
           endpoint="/api/chat/completions",
           body=body,
           user_id=priority_data["user"].id if priority_data["user"] else None,
           auth_type=priority_data["auth_type"]
       )
       
       # Add request to queue and get position
       position = await queue_manager.add_request(request_obj)
       
       # If streaming is requested
       if body.get("stream", False):
           return StreamingResponse(
               queue_manager.processor.process_streaming_request(request_obj),
               media_type="text/event-stream"
           )
       
       # For non-streaming requests
       response = await queue_manager.processor.process_request(request_obj)
       return response
   ```

4. **FastAPI Application Integration:**

   *Task Description:* Update the main FastAPI application to initialize and connect to the RabbitMQ queue manager during startup and properly close connections during shutdown.

   ```python
   # backend/app/main.py (excerpt)
   from .queue.rabbitmq.manager import RabbitMQManager  # Import RabbitMQManager

   # Initialize RabbitMQManager (ensure it's a singleton)
   queue_manager = RabbitMQManager()

   @app.on_event("startup")
   async def startup_event():
       """Connect to RabbitMQ on startup"""
       await queue_manager.connect()

   @app.on_event("shutdown")
   async def shutdown_event():
       """Close RabbitMQ connection on shutdown"""
       await queue_manager.close()
   ```

5. **Queue Monitoring Endpoints:**

   *Task Description:* Create endpoints to monitor the queue status. These will be used by the admin panel to display queue information.

   ```python
   # backend/app/api/gateway.py (excerpt)
   @router.get("/queue/status")
   async def queue_status(
       current_user: User = Depends(get_current_user)
   ):
       """Get current queue status (authenticated users only)"""
       status = await queue_manager.get_status()
       return status
   ```

6. **Queue Administration Endpoints:**

   *Task Description:* Create admin-only endpoints for managing the queue, such as clearing it.

   ```python
   # backend/app/api/gateway.py (excerpt)
   @router.post("/queue/clear")
   async def clear_queue(
       current_user: User = Depends(get_current_admin_user)
   ):
       """Clear the queue (admin only)"""
       await queue_manager.clear_queue()
       return {"message": "Queue cleared successfully"}
   ```

7. **Health Check Implementation:**

   *Task Description:* Implement a health check endpoint to verify that Ollama and RabbitMQ are running and responsive.

   ```python
   # backend/app/api/gateway.py (excerpt)
   @router.get("/health")
   async def api_health():
       """Check API gateway health"""
       # Check Ollama connection
       try:
           async with httpx.AsyncClient() as client:
               response = await client.get(f"{OLLAMA_API_URL}/api/tags")
               ollama_status = response.status_code == 200
       except:
           ollama_status = False
       
       # Check RabbitMQ connection
       try:
           status = await queue_manager.get_status()
           rabbitmq_status = status["rabbitmq_connected"]
       except:
           rabbitmq_status = False
       
       return {
           "status": "healthy" if (ollama_status and rabbitmq_status) else "degraded",
           "ollama_connected": ollama_status,
           "rabbitmq_connected": rabbitmq_status
       }
   ```

8. **Ollama Configuration:**

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

## RabbitMQ Component Architecture

The RabbitMQ implementation is divided into the following components:

1. **Connection Manager** (connection.py):
   - Establishes and maintains connections to RabbitMQ
   - Handles reconnection logic
   - Provides channel access

2. **Exchange Manager** (exchanges.py):
   - Declares and manages RabbitMQ exchanges
   - Sets up exchange bindings
   - Configures dead letter exchanges

3. **Queue Manager** (queues.py):
   - Declares and manages priority queues
   - Handles message publishing and consumption
   - Provides queue size reporting

4. **Aging Manager** (aging.py):
   - Manages request aging to prevent starvation
   - Consumes messages from dead letter queues
   - Promotes aged messages to higher priority queues

5. **Request Processor** (processor.py):
   - Processes requests to Ollama
   - Handles streaming and non-streaming responses
   - Tracks request statistics

6. **Main Manager** (manager.py):
   - Coordinates all components
   - Implements the BaseQueueManager interface
   - Provides a unified API for queue operations

This component-based architecture ensures:
- Clear separation of concerns
- Files under 300 lines
- Maintainable and testable code
- Robust error handling
- Reliable message delivery