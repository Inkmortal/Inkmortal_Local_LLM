# Technical Context

## Development Environment

-   **Operating System:** macOS (Mac Mini M4 Pro)
-   **Package Manager:** Homebrew
-   **Python Version:** 3.11+ (using `pyenv` and `venv` for virtual environments)
-   **Node.js Version:** 20+ (using `pnpm` for package management)
-   **Database:** PostgreSQL (managed via Homebrew)
-   **LLM Server:** Ollama (managed via Homebrew)
-   **Reverse Proxy:** Nginx (managed via Homebrew)
-   **Networking:** Cloudflare Tunnel

## Dependencies

### Backend (FastAPI)

-   `fastapi`: Web framework for building APIs.
-   `uvicorn`: ASGI server for running FastAPI applications.
-   `sqlalchemy`: SQL toolkit and Object-Relational Mapper (ORM).
-   `psycopg2-binary`: PostgreSQL adapter for Python.
-   `httpx`: HTTP client for making requests to Ollama and other services.
-   `python-jose[cryptography]`: JWT implementation for authentication.
-   `python-multipart`: For handling file uploads.
-   `aio-pika`: Asynchronous Python client library for RabbitMQ.
-   `passlib`: Password hashing library.

### Frontend (React)

-   `react`: JavaScript library for building user interfaces.
-   `react-router-dom`: Declarative routing for React applications.
-   `@tanstack/react-query`: Data fetching and caching library.
-   `typescript`: Typed superset of JavaScript.
-   `vite`: Fast build tool for modern web projects.
-   `tailwindcss`: Utility-first CSS framework.
-   `react-syntax-highlighter`: For code highlighting in the chat interface.

### CSS

-   Tailwind CSS will be used for styling the frontend components.

### Nginx

-   Configuration files for routing and proxy settings.

### Cloudflare Tunnel

-   Configuration file (`config.yml`) for tunnel settings.

## Setup Instructions

1.  **Install Core Dependencies:**

    ```bash
    brew install ollama nginx node postgresql pyenv
    npm install -g pnpm
    ```

2.  **Backend Setup (using pyenv and venv):**

    ```bash
    cd backend
    pyenv install 3.11.0  # Or your desired Python version
    pyenv local 3.11.0
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

3.  **Frontend Setup:**

    ```bash
    cd frontend
    pnpm install
    ```

    -   Add Tailwind directives to `src/index.css`.
    -   Configure template paths in `tailwind.config.js`.

4.  **Database Setup:**
    -   Start PostgreSQL service: `brew services start postgresql`
    -   Create a database and user. The default database URL is `postgresql://postgres:postgres@localhost/seadragon`. You can customize this by setting the `DATABASE_URL` environment variable.

5.  **Ollama Setup:**
    -   Start Ollama service: `brew services start ollama`
    -   Pull Llama 3 70B model: `ollama pull llama3:70b`.

6.  **Nginx Configuration:**
    -   Create configuration files in `nginx/` directory.
    -   Link configuration to Nginx: `brew link nginx`

7.  **Cloudflare Tunnel Setup:**
    -   Install `cloudflared`: `brew install cloudflared`
    -   Create a tunnel and configure DNS records in Cloudflare dashboard.
    -   Create `~/.cloudflared/config.yml` with tunnel credentials.

8.  **Automated Setup (Optional):**
    -   Run the `scripts/setup.ps1` PowerShell script to automate the initial project setup. Note: This script assumes it's being run from the `Inkmortal_Local_LLM` directory.

## Configuration

The application uses environment variables for configuration. A `.env.example` file is provided in the `backend` directory. You should create a `.env` file in the `backend` directory and set the necessary environment variables. Key environment variables include:

-   `DATABASE_URL`: The URL for the PostgreSQL database.
-   `RABBITMQ_URL`: The URL for the RabbitMQ server.
-   `OLLAMA_API_URL`: The URL for the Ollama API.
-   `DEFAULT_MODEL`: The default LLM model to use.
-   `SECRET_KEY`: A secret key for JWT token generation.
-   `WHITELISTED_IPS`: A comma-separated list of whitelisted IP addresses.
- `APP_ENV`: The application environment ('development', 'testing', or 'production').
- `BASE_DOMAIN`: The base domain for the application.