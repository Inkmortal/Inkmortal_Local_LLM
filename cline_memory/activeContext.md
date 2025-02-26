# Active Context

## Current Focus
- Implementing core system components.
- Setting up the development environment.
- Enhancing the web interface for educational features.

## Implementation Plan Rationale
The implementation order begins with admin panel and authentication components because they are prerequisites for testing and managing other parts of the system. This approach allows us to:
- Generate authentication tokens needed for testing other components
- Establish a management interface early in development
- Build core API endpoints progressively

## Code Organization Principles
- All code files must stay under 400 lines
- Large files should be refactored into smaller components
- Use modular architecture to maintain clarity and maintainability

## Immediate Next Steps
1. Continue with detailed implementation of each major component in the `implementation/` directory, following this order:
    - `01_core_infrastructure.md`: Base system setup, project structure, and initial deployment scripts. (**Initial setup complete**)
    - `03_authentication.md`: Implementing user registration, authentication, and authorization. (Basic authentication for Admin Panel first)
    - `04_api_gateway.md`: Configuring the API gateway, routing, and request handling. (Partial implementation initially to support Admin Panel, then full implementation)
    - `06_admin_panel.md`: Creating the React-based administration panel. (Prioritized, requires basic authentication and API endpoints)
    - `04_api_gateway.md`: (Continued) Full API Gateway implementation.
    - `02_ollama_integration.md`: Setting up Ollama, creating the proxy service, and implementing the queue manager.
    - `05_web_interface.md`: Building the React-based chat interface with educational features.
    - `07_monitoring.md`: Implementing system monitoring, logging, and usage tracking.

## Web Interface Educational Focus
The web interface should emphasize educational assistant capabilities:
- Math problem solving with LaTeX rendering
- Code teaching and assistance with syntax highlighting
- Textbook question support with image upload
- User-friendly, beautiful, and functional design

## Key Decisions
- Using a microservices architecture with a central API gateway.
- Implementing a priority-based queue system.
- Using FastAPI for the backend and React for the frontend.
- Using Ollama for LLM serving.
- Using Cloudflare Tunnel for secure remote access.
- Prioritizing Admin Panel implementation, with necessary authentication and API support.
- Designing the system as a hobby project focused on personal educational use.
- Chaycards application will connect as a client via API rather than direct integration.

## Open Questions
- Specific details of the queue management algorithm.
- Fine-tuning of Nginx configuration.
- Detailed design of the monitoring dashboards.
- Most effective prompting techniques for educational use cases.