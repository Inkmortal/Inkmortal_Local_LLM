# Technical Context

## Development Environment
- **Operating System:** macOS (Mac Mini M4 Pro)
- **Package Manager:** Homebrew
- **Python Version:** 3.11+ (using `pyenv` and `venv` for virtual environments)
- **Node.js Version:** 20+ (using `pnpm` for package management)
- **Database:** PostgreSQL (managed via Homebrew)
- **LLM Server:** Ollama (managed via Homebrew)
- **Reverse Proxy:** Nginx (managed via Homebrew)
- **Networking:** Cloudflare Tunnel

## Dependencies

### Backend (FastAPI)
- `fastapi`: Web framework for building APIs.
- `uvicorn`: ASGI server for running FastAPI applications.
- `sqlalchemy`: SQL toolkit and Object-Relational Mapper (ORM).
- `psycopg2-binary`: PostgreSQL adapter for Python.
- `httpx`: HTTP client for making requests to Ollama.
- `python-jose[cryptography]`: JWT implementation for authentication.
- `python-multipart`: For handling file uploads.

### Frontend (React)
- `react`: JavaScript library for building user interfaces.
- `react-router-dom`: Declarative routing for React applications.
- `@tanstack/react-query`: Data fetching and caching library.
- `typescript`: Typed superset of JavaScript.
- `vite`: Fast build tool for modern web projects.
- `tailwindcss`: Utility-first CSS framework.
- `react-syntax-highlighter`: For code highlighting in the chat interface.

### CSS
- Tailwind CSS will be used for styling the frontend components.

### Nginx
- Configuration files for routing and proxy settings.

### Cloudflare Tunnel
- Configuration file (`config.yml`) for tunnel settings.

## Setup Instructions

1. **Install Core Dependencies:**
    ```bash
    brew install ollama nginx node postgresql pyenv
    npm install -g pnpm
    ```

2. **Backend Setup (using pyenv and venv):**
    ```bash
    cd backend
    pyenv install 3.11.0  # Or your desired Python version
    pyenv local 3.11.0
    python -m venv venv
    source venv/bin/activate
    pip install fastapi uvicorn sqlalchemy psycopg2-binary httpx python-jose[cryptography] python-multipart
    ```

3. **Frontend Setup:**
    ```bash
    cd frontend
    pnpm install
    ```
   - Add Tailwind directives to `src/index.css`.
   - Configure template paths in `tailwind.config.js`.

4. **Database Setup:**
   - Start PostgreSQL service: `brew services start postgresql`
   - Create a database and user.

5. **Ollama Setup:**
   - Start Ollama service: `brew services start ollama`
   - Pull Llama 3 70B model: `ollama pull llama3:70b`.

6. **Nginx Configuration:**
   - Create configuration files in `nginx/` directory.
   - Link configuration to Nginx: `brew link nginx`

7. **Cloudflare Tunnel Setup:**
   - Install `cloudflared`: `brew install cloudflared`
   - Create a tunnel and configure DNS records in Cloudflare dashboard.
   - Create `~/.cloudflared/config.yml` with tunnel credentials.

8. **Automated Setup (Optional):**
    - Run the `scripts/setup.ps1` PowerShell script to automate the initial project setup. Note: This script assumes it's being run from the `Inkmortal_Local_LLM` directory.