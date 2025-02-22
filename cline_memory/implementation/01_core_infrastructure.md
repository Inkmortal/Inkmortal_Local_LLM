# Core Infrastructure Implementation

## Overview
This document outlines the steps to set up the base system, including project structure, initial deployment scripts, and environment configuration. Each step includes a description of the task and the corresponding code/configuration where applicable.

## Steps

1.  **Project Directory Structure:**

    *Task Description:* Create the project subdirectories within the existing `Inkmortal_Local_LLM` directory to organize the backend, frontend, Nginx configuration, and deployment scripts. This structure is crucial for maintaining a clean and manageable codebase.

    ```
    Inkmortal_Local_LLM/
    ├── backend/
    │   ├── app/
    │   │   ├── __init__.py
    │   │   ├── main.py        # FastAPI entry point
    │   │   ├── queue/       # Queue management
    │   │   │   ├── __init__.py
    │   │   │   └── manager.py
    │   │   ├── auth/        # Authentication service
    │   │   │   ├── __init__.py
    │   │   │   ├── models.py
    │   │   │   └── router.py
    │   │   └── api/         # API endpoints
    │   │       └── ...
    │   ├── venv/            # Virtual environment
    │   └── ...
    ├── frontend/
    │   ├── public/
    │   ├── src/
    │   │   ├── components/
    │   │   ├── pages/
    │   │   ├── App.tsx
    │   │   ├── index.tsx
    │   │   └── ...
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── ...
    ├── nginx/
    │   └── nginx.conf       # Nginx configuration
    ├── scripts/             # Deployment and utility scripts
    │   ├── setup.sh
    │   └── ...
    └── .clinerules          # Project-specific intelligence
    ```

2.  **Initial `backend/app/main.py`:**

    *Task Description:* Create a minimal FastAPI application with a single root endpoint that returns a simple message. This serves as a starting point and a basic check to ensure the backend is running.

    ```python
    from fastapi import FastAPI

    app = FastAPI()

    @app.get("/")
    async def root():
        return {"message": "Seadragon LLM Server"}

    ```

3.  **Initial `frontend/src/App.tsx`:**

    *Task Description:* Create a very basic React component that displays a heading. This provides a starting point for the frontend and confirms that the React setup is working.

    ```typescript
    function App() {
      return (
        <div>
          <h1>Seadragon LLM</h1>
        </div>
      )
    }

    export default App
    ```

4. **Initial `nginx/nginx.conf` (Basic proxy):**

    *Task Description:* Configure Nginx as a reverse proxy to forward requests to the FastAPI backend. This sets up the basic routing for the application.

    ```
    http {
        server {
            listen 80;
            server_name local-llm.seadragoninkmortal.com;

            location / {
                proxy_pass http://localhost:8000; # FastAPI
                proxy_http_version 1.1;
                proxy_set_header Connection '';
                proxy_buffering off;
                proxy_cache off;
                proxy_read_timeout 24h;
            }
        }
    }
    ```

5.  **`scripts/setup.sh`:**

    *Task Description:* Create a shell script to automate the initial project setup. This script creates the directory structure, sets up the Python virtual environment, installs backend dependencies, initializes the React frontend, and installs frontend dependencies.  **Note:** This script now assumes it's being run from the `Inkmortal_Local_LLM` directory.

    ```bash
    #!/bin/bash

    # Create project directories
    mkdir -p backend/{app,app/queue,app/auth,app/api} frontend nginx scripts
    touch backend/app/__init__.py backend/app/queue/__init__.py backend/app/auth/__init__.py

    # Backend setup
    cd backend
    python -m venv venv
    source venv/bin/activate
    pip install fastapi uvicorn

    # Frontend setup
    cd ../frontend
    pnpm create vite . --template react-ts
    pnpm install
    pnpm install tailwindcss postcss autoprefixer
    pnpm tailwindcss init -p

    echo "Project structure created.  Remember to configure Nginx and Cloudflare."
    ```

6. **Database Setup:**

    *Task Description:* Initialize the PostgreSQL database service using Homebrew. Create a dedicated database user and a database specifically for this project. This ensures that the application has a persistent data store.

7. **Environment Variables:**

    *Task Description:* Create `.env` files within both the `backend/` and `frontend/` directories. These files will store environment-specific settings, such as API keys, database connection strings, and other sensitive information, keeping them separate from the codebase.

8. **Cloudflare Tunnel:**

    *Task Description:* Set up a Cloudflare Tunnel to provide secure remote access to the application without exposing any ports directly. This involves creating a tunnel in the Cloudflare dashboard, configuring DNS records, and creating a `~/.cloudflared/config.yml` file with the tunnel credentials on the server.