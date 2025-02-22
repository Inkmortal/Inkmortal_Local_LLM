# System Patterns and Architecture

## Core Architecture
The system will follow a microservices architecture with a central API gateway managing requests and routing them to appropriate services. A priority-based queue system will ensure fair resource allocation among different user groups.

## Key Components
1. **API Gateway (FastAPI):**
   - Handles all incoming requests.
   - Routes requests to the appropriate service.
   - Implements priority-based queuing.
   - Performs authentication and authorization checks.

2. **Ollama Proxy Service:**
   - Transparently proxies requests to the Ollama LLM server.
   - Integrates with the queue manager.

3. **Authentication Service (FastAPI):**
   - Manages user registration and authentication.
   - Issues and validates JWT tokens.
   - Handles registration token management.

4. **User Management Service (FastAPI):**
   - Stores user information and API keys.
   - Manages API key priorities and usage tracking.

5. **Web Interface (React):**
   - Provides a chat interface for registered users.
   - Communicates with the API Gateway.

6. **Admin Panel (React):**
   - Allows administrators to manage users, API keys, IP whitelist, and system settings.
   - Provides monitoring dashboards.

7. **Database (PostgreSQL):**
   - Stores user data, API keys, registration tokens, and system logs.

## Design Patterns
- **Microservices:** Decomposing the system into independent, manageable services.
- **API Gateway:** Providing a single entry point for all client requests.
- **Reverse Proxy (Nginx):** Handling load balancing, SSL termination, and routing.
- **Priority Queue:** Managing requests based on assigned priorities.
- **Observer:** Monitoring system events and triggering actions.
- **Singleton:** Ensuring a single instance of the Queue Manager.

## Communication
- **Internal:** Services communicate via HTTP requests.
- **External:** Clients communicate with the API Gateway via HTTPS.
- **Real-time:** WebSockets for chat functionality.

## Technology Choices
- **FastAPI:** High-performance, easy-to-use framework for building APIs.
- **React:** Flexible and efficient library for building user interfaces.
- **PostgreSQL:** Robust and reliable relational database.
- **Ollama:** Optimized for running large language models.
- **Nginx:** High-performance web server and reverse proxy.
- **Cloudflare Tunnel:** Secure remote access without exposing ports.
- **JWT:** Standard for secure token-based authentication.