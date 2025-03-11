# Inkmortal Local LLM Coding Guidelines

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

## Working Guidelines
- Keep code files manageable (max ~300 lines per file)
- Always inspect code and related files before editing
- Present a task plan before beginning any work
- Ensure complete understanding of context before making changes
- Split large components into smaller, focused ones
- Maintain consistent error handling patterns
- Ensure all asynchronous operations have proper cleanup
- Use React.memo, useCallback, and useMemo for performance
- Add comprehensive comments for complex logic

## Recent Project Updates
- Implemented new chat architecture with WebSocket integration
- Added support for conversation history management
- Enhanced message rendering with section support (thinking/response)
- Improved error handling and reconnection logic
- Added theme integration throughout all components