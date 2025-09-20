# API Gateway Implementation

## Overview

This document describes the implementation of the API Gateway, which is the central entry point for all client requests to the Seadragon LLM system. The API Gateway handles request routing, authentication, authorization, and integration with the priority-based queue system.

## Implementation Details

The API Gateway is implemented using FastAPI and is located in `backend/app/api/gateway.py`.

**Key Features:**

-   **Ollama Proxy:** The gateway proxies requests to the Ollama API, making the local LLM accessible through a consistent interface. It supports both chat completions (`/api/chat/completions`) and regular completions (`/api/completions`).
-   **Priority-Based Queuing:** All requests to Ollama are routed through a priority-based queue (implemented using RabbitMQ). The priority is determined by the authentication method:
    -   **API Key (X-API-Key header):** Priority is determined by the API key settings (configurable by admins).
    -   **JWT Token (Authorization header):** Priority 3 (web interface).
    -   **IP Whitelist:** Priority 1 (direct API access).
-   **Streaming and Non-Streaming Responses:** The gateway supports both streaming and non-streaming responses from Ollama.
-   **Authentication and Authorization:**
    -   **API Key Authentication:** Validates API keys provided in the `X-API-Key` header.
    -   **JWT Authentication:** Validates JWT tokens provided in the `Authorization` header.
    -   **IP Whitelist:** Allows direct API access from whitelisted IP addresses.
    -   **Admin-Only Endpoints:** Certain endpoints (e.g., clearing the queue) are restricted to admin users.
-   **Dynamic Model Selection:** The gateway allows specifying the Ollama model to use in the request body. It defaults to a configured default model.
-   **Model Listing:** Provides an endpoint (`/api/models`) to list available Ollama models.
-   **Queue Status:** Provides an endpoint (`/api/queue/status`) to get the current queue status (requires authentication).
-   **Queue Clearing:** Provides an admin-only endpoint (`/api/queue/clear`) to clear the queue.
-   **Health Check:** Provides a health check endpoint (`/api/health`) to verify the status of Ollama and RabbitMQ.
- **Error Handling:** Includes error handling for invalid authentication, queue errors, and Ollama API failures.
- **Dependency Injection:** Uses FastAPI's dependency injection system for managing dependencies (database sessions, queue manager, current user).

**Key Files:**

-   `backend/app/api/gateway.py`: Main implementation of the API Gateway.
-   `backend/app/auth/utils.py`: Utility functions for authentication and authorization (including API key validation).
-   `backend/app/queue/interface.py`: Definition of the `QueueManagerInterface`.
-   `backend/app/queue/models.py`: Definition of `QueuedRequest` and `RequestPriority`.
-   `backend/app/queue/rabbitmq/manager.py`: RabbitMQ implementation of the `QueueManagerInterface`.
-   `backend/app/config.py`: Configuration settings, including the Ollama API URL and default model.

**Endpoints:**

-   **`/api/chat/completions` (POST):** Proxy for Ollama's chat completions API (supports streaming and non-streaming).
-   **`/api/completions` (POST):** Proxy for Ollama's completions API (supports streaming and non-streaming).
-   **`/api/models` (GET):** Lists available Ollama models.
-   **`/api/queue/status` (GET):** Gets the current queue status (requires authentication).
-   **`/api/queue/clear` (POST):** Clears the queue (admin only).
-   **`/api/health` (GET):** Checks the health of the API Gateway (Ollama and RabbitMQ).

**Example Request (Chat Completions, Non-Streaming):**

```http
POST /api/chat/completions
X-API-Key: your-api-key
Content-Type: application/json

{
  "model": "llama3.3:70b",
  "messages": [
    {"role": "user", "content": "Hello, who are you?"}
  ]
}
```

**Example Request (Chat Completions, Streaming):**

```http
POST /api/chat/completions
X-API-Key: your-api-key
Content-Type: application/json

{
  "model": "llama3.3:70b",
  "messages": [
    {"role": "user", "content": "Hello, who are you?"}
  ],
  "stream": true
}