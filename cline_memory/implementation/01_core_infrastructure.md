# Core Infrastructure Implementation

## Overview

This document outlines the steps to set up the base system, including project structure, initial deployment scripts, and environment configuration.

## Steps

1.  **Project Directory Structure:**

    The project is organized into the following subdirectories within the `Inkmortal_Local_LLM` directory:

    ```
    Inkmortal_Local_LLM/
    ├── .clinerules          # Project-specific intelligence
    ├── .gitignore          # Files and directories to ignore in Git
    ├── CLAUDE.md           # Documentation
    ├── backend/            # Backend application (FastAPI)
    │   ├── app/
    │   │   ├── __init__.py
    │   │   ├── admin/      # Admin API endpoints
    │   │   │   ├── __init__.py
    │   │   │   ├── api_keys.py
    │   │   │   ├── ip_whitelist.py
    │   │   │   ├── queue_monitor.py
    │   │   │   ├── registration_tokens.py
    │   │   │   ├── router.py
    │   │   │   ├── stats.py
    │   │   │   └── system_stats.py
    │   │   ├── api/        # API endpoints
    │   │   │   ├── __init__.py
    │   │   │   ├── artifacts.py
    │   │   │   ├── chat.py
    │   │   │   └── gateway.py
    │   │   ├── auth/       # Authentication service
    │   │   │   ├── __init__.py
    │   │   │   ├── activities.py
    │   │   │   ├── models.py
    │   │   │   ├── router.py
    │   │   │   └── utils.py
    │   │   ├── config.py   # Configuration settings
    │   │   ├── db.py       # Database setup
    │   │   ├── main.py     # FastAPI entry point
    │   │   └── queue/      # Queue management
    │   │       ├── __init__.py
    │   │       ├── base.py
    │   │       ├── interface.py
    │   │       ├── models.py
    │   │       ├── mock/
    │   │       │   ├── __init__.py
    │   │       │   └── manager.py
    │   │       └── rabbitmq/
    │   │           ├── __init__.py
    │   │           ├── aging.py
    │   │           ├── connection.py
    │   │           ├── exchanges.py
    │   │           ├── manager.py
    │   │           ├── processor.py
    │   │           └── queues.py
    │   ├── .coverage
    │   ├── .env.example
    │   ├── pytest.ini
    │   ├── README_ARTIFACTS.md
    │   ├── requirements.txt
    │   └── update_main.py
    ├── cline_memory/       # Memory bank for Cline
    │   └── ...
    ├── frontend/           # Frontend application (React)
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
    │   └── nginx.conf      # Nginx configuration
    │   └── ...
    ├── scripts/            # Deployment and utility scripts
    │   └── setup.ps1       # PowerShell setup script
    └── temp_implementationplan.md
    ```

2.  **Automated Setup (`scripts/setup.ps1`):**

    The `scripts/setup.ps1` PowerShell script automates the initial project setup. It handles tasks such as:

    -   Creating the project directory structure.
    -   Setting up the Python virtual environment.
    -   Installing backend dependencies.
    -   Initializing the React frontend.
    -   Installing frontend dependencies.
    -   Detecting and configuring PostgreSQL.

    Run the script from the `Inkmortal_Local_LLM` directory:

    ```powershell
    .\scripts\setup.ps1
    ```

3.  **Manual Service Setup (and verification):**

    The `setup.ps1` script attempts to automate service setup, but you should verify and, if necessary, manually configure the following services using Homebrew:

    -   **PostgreSQL:**
        -   Install: `brew install postgresql`
        -   Start: `brew services start postgresql`
        -   Verify (should show "started"): `brew services list`
        -   Default Port: 5432
        -   Create a database user and database. You can do this manually using the `psql` command-line tool, or the `setup.ps1` script will handle it if PostgreSQL is detected. The default database URL expected by the application is `postgresql://postgres:postgres@localhost/seadragon`. You can customize this by setting the `DATABASE_URL` environment variable in the `backend/.env` file. Example commands using `psql`:
            ```sql
            CREATE USER postgres WITH PASSWORD 'postgres';
            CREATE DATABASE seadragon;
            GRANT ALL PRIVILEGES ON DATABASE seadragon TO postgres;
            ```

    -   **Ollama:**
        -   Install: `brew install ollama`
        -   Start: `brew services start ollama`
        -   Verify (should show "started"): `brew services list`
        -   Default Port: 11434
        -   Pull the Llama 3 70B model: `ollama pull llama3:70b`

    -   **RabbitMQ:**
        - Install: `brew install rabbitmq`
        - Start: `brew services start rabbitmq`
        - Verify (should show "started"): `brew services list`
        - Default Port: 5672 (for AMQP), 15672 (for management UI)
        - Note: The `setup.ps1` script does *not* automatically configure RabbitMQ users or virtual hosts.  For a development environment, the default "guest" user with password "guest" is often sufficient, and this is what the default `RABBITMQ_URL` in `.env.example` assumes.  For production, you *must* create a dedicated user and virtual host.

    - **Nginx:**
        - Install: `brew install nginx`
        - Start: `brew services start nginx`
        - Verify (should show "started"): `brew services list`
        - Default Port: 8080 (but we'll configure it to listen on 80 in `nginx.conf`)
        - You'll need to link the configuration file: `brew link nginx`

4.  **Environment Variables:**

    Create `.env` files in both the `backend/` and `frontend/` directories to store environment-specific settings (API keys, database connection strings, etc.). Refer to the `.env.example` file in the `backend` directory for the required variables.

5.  **Cloudflare Tunnel:**

    Set up a Cloudflare Tunnel for secure remote access:

    -   Install `cloudflared`: `brew install cloudflared`
    -   Create a tunnel and configure DNS records in the Cloudflare dashboard.
    -   Create `~/.cloudflared/config.yml` with the tunnel credentials.