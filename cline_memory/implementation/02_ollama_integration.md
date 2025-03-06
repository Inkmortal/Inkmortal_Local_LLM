# Ollama Integration Implementation

## Overview

This document outlines the integration of Ollama into the Seadragon LLM system. This includes setting up Ollama, creating a proxy service to forward requests to Ollama (implemented within the API Gateway), and implementing the queue manager to prioritize requests.

## Steps

1.  **Ollama Installation and Setup:**

    Install Ollama using Homebrew:

    ```bash
    brew install ollama
    brew services start ollama
    ```

    The system dynamically fetches available models from Ollama. You can install models using the `ollama pull` command. For example:

    ```bash
    ollama pull llama3:70b
    ollama pull <other_model_name>
    ```

    The user currently has the following models installed:
    - Llama 3.3 70B
    - Athene-v2 (Qwen finetune, 72B)
    - QWQ (qwen thinking, 32b)

2.  **RabbitMQ Queue System Implementation:**

    A robust, component-based queue system using RabbitMQ is implemented to manage request prioritization and processing. This ensures high-priority requests are processed before lower-priority requests.

    Key features include:

    -   Priority-based request queuing
    -   Request aging to prevent starvation of low-priority requests
    -   Error handling and recovery
    -   Connection management with proper startup/shutdown hooks
    -   Process locking to prevent race conditions

    See the following files for implementation details:

    -   `backend/app/queue/interface.py`: Queue manager interface.
    -   `backend/app/queue/models.py`: Data models for queued requests and statistics.
    -   `backend/app/queue/rabbitmq/manager.py`: RabbitMQ queue manager implementation.
    -   `backend/app/queue/rabbitmq/connection.py`: RabbitMQ connection management.
    -   `backend/app/queue/rabbitmq/exchanges.py`: RabbitMQ exchange management.
    -   `backend/app/queue/rabbitmq/queues.py`: RabbitMQ queue management.
    -   `backend/app/queue/rabbitmq/aging.py`: Request aging and promotion.
    -   `backend/app/queue/rabbitmq/processor.py`: Request processing logic.
    -   `backend/app/queue/mock/manager.py`: Mock queue manager for testing.

3.  **API Gateway Integration:**

    The API Gateway (`backend/app/api/gateway.py`) is integrated with the RabbitMQ queue manager to route all requests to Ollama through the priority-based queue system. It also handles dynamic model selection by allowing the `model` parameter to be specified in the request body. See `backend/app/api/gateway.py` for the implementation.

4.  **FastAPI Application Integration:**

    The main FastAPI application (`backend/app/main.py`) initializes and connects to the RabbitMQ queue manager during startup and closes connections during shutdown. The `get_queue_manager` function is used to obtain the singleton instance of the `RabbitMQManager`. See `backend/app/main.py` for the implementation.

5.  **Queue Monitoring Endpoints:**

    Queue status monitoring is implemented in `backend/app/admin/queue_monitor.py` and `backend/app/admin/system_stats.py`.

6.  **Queue Administration Endpoints:**

   Admin-only endpoints for managing the queue (e.g., clearing the queue) are implemented in `backend/app/admin/router.py` and related files.

7.  **Health Check Implementation:**

    A health check endpoint (`/api/health`) is implemented in `backend/app/api/gateway.py` to verify the status of Ollama and RabbitMQ.

8. **Model Management:**
    - The system dynamically fetches available models from Ollama.
    - The active model can be selected through the admin panel (System Stats dashboard).
    - The selected model is used for subsequent requests.

## RabbitMQ Component Architecture

The RabbitMQ implementation is divided into the following components:

1.  **Connection Manager** (`connection.py`):
    -   Establishes and maintains connections to RabbitMQ
    -   Handles reconnection logic
    -   Provides channel access

2.  **Exchange Manager** (`exchanges.py`):
    -   Declares and manages RabbitMQ exchanges
    -   Sets up exchange bindings
    -   Configures dead letter exchanges

3.  **Queue Manager** (`queues.py`):
    -   Declares and manages priority queues
    -   Handles message publishing and consumption
    -   Provides queue size reporting

4.  **Aging Manager** (`aging.py`):
    -   Manages request aging to prevent starvation
    -   Consumes messages from dead letter queues
    -   Promotes aged messages to higher priority queues

5.  **Request Processor** (`processor.py`):
    -   Processes requests to Ollama
    -   Handles streaming and non-streaming responses
    -   Tracks request statistics

6.  **Main Manager** (`manager.py`):
    -   Coordinates all components
    -   Implements the `QueueManagerInterface`
    -   Provides a unified API for queue operations

This component-based architecture ensures:

-   Clear separation of concerns
-   Files under 400 lines
-   Maintainable and testable code
-   Robust error handling
-   Reliable message delivery

## Testing Infrastructure

A comprehensive testing infrastructure ensures the reliability and correctness of the queueing system:

1.  **Mock Queue Manager** (`mock/manager.py`):
    -   In-memory implementation of the `QueueManagerInterface`
    -   Supports all operations without external dependencies
    -   Used for testing in environments without RabbitMQ

2.  **Queue Manager Interface** (`interface.py`):
    -   Defines the abstract interface that all queue manager implementations must follow
    -   Ensures consistency between mock and real implementations
    -   Enables dependency injection in tests

3.  **Queue Model Tests** (`backend/tests/test_queue_manager.py`):
    -   Tests the core functionality of queue managers
    -   Verifies request aging, queue ordering, and request processing
    -   Uses fixtures to provide a clean environment for each test

4.  **Queue Integration Tests** (`backend/tests/test_queue_and_gateway.py`):
    -   Tests the integration between API Gateway and queue manager
    -   Verifies authentication requirements and priority assignment
    -   Tests streaming and non-streaming responses

5.  **Key Testing Features**:
    -   Proper interface abstraction to prevent implementation-specific dependencies
    -   Consistent error handling and recovery
    -   Statistics tracking for performance monitoring
    -   Prevention of double-promotion in request aging logic
    -   Comprehensive debugging for troubleshooting
    -   Reliable fixtures for test isolation