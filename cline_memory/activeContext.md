# Active Context

## Current Focus

-   Connecting the chat interface to the backend API, including integrating backend artifact rendering.
-   Implementing conversation history and context window management for multi-user support.
-   Investigating and enabling LLM tool use within the chat interface.
-   Ensuring the API is ready for LangChain integration (using existing API key and endpoint).

## Implementation Plan Rationale

The implementation order prioritizes the chat interface and its core functionalities, as this is the primary way users will interact with the LLM. Authentication and the admin panel are considered largely complete.

## Code Organization Principles

-   All code files must stay under 400 lines
-   Large files should be refactored into smaller components
-   Use modular architecture to maintain clarity and maintainability
-   Delegate specific responsibilities to appropriate components

## Immediate Next Steps

1.  **Connect Chat Interface to Backend API:**
    -   Replace mock chat service with actual API calls to `/api/chat/completions`.
    -   Implement streaming responses for chat messages.
    -   Add error handling for API failures.
    -   Implement user session persistence (using JWT tokens).
    -   Integrate backend artifact rendering for math and code blocks.

2.  **Implement Conversation History and Context Windows:**
    -   Design a data model for storing conversation history (likely in the database).
    -   Implement mechanisms for retrieving and updating conversation history.
    -   Develop a strategy for managing context windows (limiting the amount of past conversation sent to the LLM). Including conversation summarization, or even backend RAG solution for important entities (limited to within conversation) and uploaded documents. ability to update notes on important entities.
    -   Ability to run embeddings, which hasnt been implemented yet. possibly with a model like nomic embed

3.  **Investigate and Enable LLM Tool Use:**
    -   Research how to integrate tools with Ollama and the chosen LLM.
    -   Continue to implement the necessary API endpoints and backend logic for tool use.

4.  **Ensure API Readiness for LangChain:**
    -   Document the existing API endpoints (especially `/api/chat/completions`) and authentication methods (API key).
    -   Provide clear instructions on how to use the API key and custom endpoint with LangChain.

## Web Interface Educational Focus

The web interface should emphasize educational assistant capabilities:

-   Math problem solving with LaTeX rendering (Implemented, needs backend integration)
-   Code teaching and assistance with syntax highlighting (Implemented, needs backend integration)
-   Textbook question support with image upload (Planned)
-   User-friendly, beautiful, and functional design (In Progress)

## Key Decisions

-   Using a microservices architecture with a central API gateway.
-   Implementing a priority-based queue system with request aging to prevent starvation (using RabbitMQ).
-   Using FastAPI for the backend and React for the frontend.
-   Using Ollama for LLM serving.
-   Using RabbitMQ for reliable queue management with a component-based architecture.
-   Using Cloudflare Tunnel for secure remote access.
-   Using a singleton pattern for the `RabbitMQManager`.
-   Employing an abstract base class (`QueueManagerInterface`) for queue manager implementations.
-   Prioritizing chat interface functionality and LLM tool use.

## Recent Progress

-   **Admin Dashboard:** Completed and connected to the backend API.
-   **Authentication:** Admin and user authentication (login/register) are complete.
-   **Chat Interface:** Basic UI is implemented, including math rendering and code highlighting. Backend rendering for artifacts exists but is not yet connected.
-   **Theme Selector:** Implemented, with minor limitations on recent theme retrieval.
- **Model Management:** Integrated into the System Stats dashboard.
- **Code Cleanup:** Removed redundant and deprecated code.
- **Routing Refactor:** Identified and documented remaining issues.

## Current Challenges

-   Connecting the chat interface to the backend API and ensuring proper artifact rendering.
-   Implementing conversation history and context window management.
-   Integrating LLM tool use.
-   Ensuring seamless LangChain integration.

## Open Questions

-   What is the best data model for storing conversation history?
-   What is the most effective strategy for managing context windows?
-   What specific tools should be integrated with the LLM, and how should they be represented in the chat interface?
-   Are there any specific LangChain features or APIs that need to be considered for optimal integration?
- How to best utilize the component-based RabbitMQ implementation for optimal performance and maintainability?
- Are there any potential bottlenecks or areas for improvement in the current backend architecture?