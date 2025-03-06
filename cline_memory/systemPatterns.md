# System Patterns and Architecture

## Core Architecture

The system follows a microservices architecture with a central API gateway managing requests and routing them to appropriate services. A priority-based queue system ensures fair resource allocation among different user groups.

## Key Components

1.  **API Gateway (FastAPI):**
    -   Handles all incoming requests.
    -   Determines request priority based on authentication method (API key, JWT, IP whitelist).
    -   Adds requests to the priority-based queue.
    -   Proxies requests to the Ollama LLM server after they are dequeued.
    -   Performs authentication and authorization checks.

2.  **Ollama Proxy Service:**
    -   Transparently proxies requests to the Ollama LLM server.
    -   Integrated with the queue manager through the `RequestProcessor`.

3.  **Authentication Service (FastAPI):**
    -   Manages user registration and authentication.
    -   Issues and validates JWT tokens.
    -   Handles registration token management.
    -   Provides endpoints for admin setup and login.
    -   Manages API keys for custom applications.

4.  **User Management Service (FastAPI):**
    -   Stores user information and API keys.
    -   Manages API key priorities and usage tracking.
    - Implemented within the Authentication Service.

5.  **Web Interface (React):**
    -   Provides a chat interface for registered users.
    -   Communicates with the API Gateway.

6.  **Admin Panel (React):**
    -   Allows administrators to manage users, API keys, IP whitelist, and system settings.
    -   Provides monitoring dashboards.

7.  **Database (PostgreSQL):**
    -   Stores user data, API keys, registration tokens, and system logs.

8. **Queue System (RabbitMQ):**
    - Implements a priority-based queue for managing LLM requests.
    - Uses RabbitMQ as the message broker.
    - Employs a singleton `RabbitMQManager` to ensure a single point of control.
    - Utilizes a component-based architecture:
        - `RabbitMQConnection`: Manages the connection to the RabbitMQ server.
        - `ExchangeManager`: Manages exchanges.
        - `QueueManager`: Manages queues and queue operations.
        - `AgingManager`: Handles request aging and promotion using dead-letter exchanges.
        - `RequestProcessor`: Processes requests by interacting with the Ollama API.
    - Implements request aging using RabbitMQ's dead-lettering features.
    - Provides statistics on queue size, request processing times, and connection status.

## Design Patterns

-   **Microservices:** Decomposing the system into independent, manageable services (API Gateway, Authentication, Queue Manager).
-   **API Gateway:** Providing a single entry point (FastAPI) for all client requests.
-   **Reverse Proxy (Nginx):** Handling load balancing, SSL termination, and routing (configured separately).
-   **Priority Queue:** Managing requests based on assigned priorities (using RabbitMQ).
-   **Observer:** Monitoring system events and triggering actions (activity logging).
-   **Singleton:** Ensuring a single instance of the `RabbitMQManager`.
-   **Abstract Base Class:** Defining a common interface (`QueueManagerInterface`) for different queue manager implementations.
-   **Dependency Injection:** Using FastAPI's dependency injection system for managing dependencies (database sessions, queue manager, current user).
-   **Component-Based Architecture:** Breaking down the RabbitMQ implementation into smaller, reusable components.

## Communication

-   **Internal:** Services communicate via HTTP requests (primarily between the API Gateway and other services).
-   **External:** Clients communicate with the API Gateway via HTTPS.
-   **Real-time:** WebSockets for chat functionality (planned, not fully implemented yet).

## Technology Choices

-   **FastAPI:** High-performance, easy-to-use framework for building APIs.
-   **React:** Flexible and efficient library for building user interfaces.
-   **PostgreSQL:** Robust and reliable relational database.
-   **Ollama:** Optimized for running large language models.
-   **Nginx:** High-performance web server and reverse proxy.
-   **Cloudflare Tunnel:** Secure remote access without exposing ports.
-   **JWT:** Standard for secure token-based authentication.
-   **RabbitMQ:** Robust and reliable message broker for queue management.
-   **aio_pika:** Asynchronous Python client library for RabbitMQ.
-   **httpx:** Asynchronous HTTP client for making requests to Ollama.
-   **passlib:** Password hashing library.
-   **python-jose:** JWT implementation for Python.
-   **SQLAlchemy:** SQL toolkit and Object-Relational Mapper (ORM).