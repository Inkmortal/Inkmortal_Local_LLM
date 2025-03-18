# Inkmortal Local LLM Coding Guidelines

## Project Overview
Seadragon LLM Server is a self-hosted LLM server system designed to provide controlled access to local LLM capabilities through a priority-based queue system. It runs on a Mac Mini M4 Pro and serves multiple user types through different interfaces while maintaining control over resource allocation and access.

## Architecture
- **Backend**: FastAPI (Python)
- **Frontend**: React with TypeScript and Tailwind CSS
- **Database**: PostgreSQL
- **LLM Server**: Ollama
- **Queue System**: RabbitMQ
- **Proxy**: Nginx
- **Networking**: Cloudflare Tunnel

## Current Development Focus
- Chat interface integration with backend
- File upload functionality for textbook questions
- Admin dashboard queue monitoring and system stats display
- Conversation history and context window management
- LLM tool use integration

## Build & Run Commands
Note that you are running on a development environment,
NEVER RUN ANY FRONTEND OR BACKEND, the user will use git
to transfer code to the testing environment.

### Frontend
```bash
cd frontend
npm install        # Install dependencies
npm run dev        # Start dev server
npm run build      # Production build
```

### Backend
```bash
cd backend
python -m uvicorn app.main:app --reload  # Run dev server
pytest                                   # Run all tests
pytest tests/test_auth.py                # Run specific test file
pytest tests/test_auth.py::test_login_success  # Run single test
```

## Code Style Guidelines

### Python (Backend)
- Use snake_case for variables, functions, files
- CamelCase for classes
- Type hints required for function parameters and returns
- Group imports: stdlib → third-party → local (with line breaks)
- 4-space indentation
- Document with docstrings for modules and functions
- Catch specific exceptions, use HTTPException for API errors
- Create separate database sessions for sync and async operations
- Use proper session lifecycle management with try/except/finally blocks

### TypeScript/React (Frontend)
- camelCase for variables, functions, props
- PascalCase for components, interfaces, types
- Group components by feature in directories
- Prefer functional components with hooks
- Destructure props at component start
- Type all props with interfaces
- Use Tailwind for styling, custom CSS sparingly
- Use React.memo() for performance-critical components
- Use useCallback and useMemo to optimize renders
- Prefer centralized state management with reducers
- Ensure all WebSocket connections have proper cleanup
- There is a theme system for styling components
- Implement token buffering for WebSocket communication efficiency

## Queue System
- Priority-based request processing
- Request source identification
- Request aging to prevent starvation
- Multiple priority levels:
  - Level 1: Direct API (coding tools)
  - Level 2: Custom applications (configurable)
  - Level 3: Web interface users

## Access Control
- Registration token system for new users
- IP whitelisting for direct API access
- Custom API key system with assignable priorities
- Admin interface for access management

## Working Guidelines
- Keep code files manageable (max ~400 lines per file)
- Always inspect code and related files before editing
- Present a task plan before beginning any work
- Ensure complete understanding of context before making changes
- Split large components into smaller, focused ones
- Maintain consistent error handling patterns
- Add comprehensive comments for complex logic
- When fixing errors follow these guidelines: 
	- Understand the problem, and present to me the problem, why its broken, and the solution. 
	- When coding, do not exceed 400 lines of code per file, otherwise break it into smaller components.
	- Always check relevant code files before editing, as well as checking what code files are available as we want to avoid overcomplicating things
	- In addition, make sure frontend and backend are aligned. 
	- We dont want messy complicated code. it should be elegant, and handle all cases. coding directly to handle edge cases is discouraged
- Do not edit files by creating patches, only edit files directly or via tools
- Do not search files via hex, it makes no sense
- Maintain modular architecture to preserve clarity and maintainability
- Follow security best practices throughout the codebase