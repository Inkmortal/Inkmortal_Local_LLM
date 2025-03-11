# Active Context

## Current Focus

-   Completing the chat interface integration with backend, fixing database transaction issues and optimizing WebSocket communication.
-   Implementing file upload functionality for textbook questions and documents.
-   Fixing admin dashboard queue monitoring and system stats display.
-   Implementing conversation history and context window management for multi-user support.
-   Investigating and enabling LLM tool use within the chat interface.

## Implementation Plan Rationale

The implementation order prioritizes the chat interface and its core functionalities, as this is the primary way users will interact with the LLM. Recent fixes have addressed major issues with transaction handling and WebSocket communication.

## Code Organization Principles

-   All code files must stay under 400 lines
-   Large files should be refactored into smaller components
-   Use modular architecture to maintain clarity and maintainability
-   Delegate specific responsibilities to appropriate components
-   Ensure proper resource cleanup to prevent memory leaks
-   Maintain session isolation between synchronous and asynchronous code

## Immediate Next Steps

1.  **Complete File Upload Functionality:**
    -   Implement file upload UI components in the chat interface.
    -   Add file preview and validation functionality.
    -   Connect file upload to sendMessage method.
    -   Test file uploads with different file types and sizes.

2.  **Fix Admin Dashboard Queue Monitoring:**
    -   Debug and fix issues with queue information display.
    -   Ensure queue cards update properly with real-time data.
    -   Implement proper error handling for admin dashboard.
    -   Add refresh controls for manual data updates.

3.  **Implement Conversation History and Context Windows:**
    -   Further enhance conversation history management.
    -   Develop a strategy for managing context windows (limiting the amount of past conversation sent to the LLM).
    -   Consider conversation summarization or backend RAG solution for important entities.
    -   Implement ability to update notes on important entities.

4.  **Investigate and Enable LLM Tool Use:**
    -   Research how to integrate tools with Ollama and the chosen LLM.
    -   Continue to implement the necessary API endpoints and backend logic for tool use.

## Web Interface Educational Focus

The web interface should emphasize educational assistant capabilities:

-   Math problem solving with LaTeX rendering (Implemented, connected to backend)
-   Code teaching and assistance with syntax highlighting (Implemented, connected to backend)
-   Textbook question support with image upload (Planned)
-   User-friendly, beautiful, and functional design (In Progress)

## Key Decisions

-   Using a microservices architecture with a central API gateway.
-   Implementing a priority-based queue system with request aging to prevent starvation (using RabbitMQ).
-   Using FastAPI for the backend and React for the frontend.
-   Using Ollama for LLM serving.
-   Using WebSocket for real-time message updates with token buffering for efficiency.
-   Creating separate database sessions for synchronous and asynchronous operations.
-   Using proper session lifecycle management with try/except/finally blocks.
-   Implementing token buffering for efficient UI updates.

## Recent Progress

-   **Chat Interface Integration:** Successfully connected the frontend chat interface to the backend API with WebSocket communication for real-time updates.
-   **Transaction Handling:** Fixed "Transaction is closed" errors in message_service.py by implementing proper session management for async functions.
-   **WebSocket Implementation:** Added token buffering for efficient UI updates and implemented reconnection logic for dropped connections.
-   **QueuedRequest Fixing:** Corrected parameters for QueuedRequest constructor and fixed related issues.
-   **Error Handling:** Improved error handling with better status updates and recovery options.
-   **Performance Optimization:** Reduced unnecessary re-renders with token buffering and implemented proper resource cleanup.

## Current Challenges

-   Completing file upload functionality for the chat interface.
-   Fixing admin dashboard queue monitoring issues.
-   Implementing advanced conversation history and context management.
-   Integrating LLM tool use.

## Open Questions

-   What is the best data model for storing conversation history?
-   What is the most effective strategy for managing context windows?
-   What specific tools should be integrated with the LLM, and how should they be represented in the chat interface?
-   How to optimize file upload handling for different file types and sizes?
-   What improvements can be made to the admin dashboard for better monitoring?
-   Are there any remaining performance bottlenecks in the WebSocket implementation?