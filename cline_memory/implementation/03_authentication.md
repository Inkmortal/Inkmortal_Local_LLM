# Authentication Implementation

## Overview

This document details the implementation of user registration, authentication, and authorization for the Seadragon LLM system. It covers both basic authentication for the admin panel and a more general authentication system for users accessing the web interface, as well as API key authentication for custom applications.

## Implementation Details

1.  **Database Models (`backend/app/auth/models.py`):**

    The following SQLAlchemy models are defined:

    -   **`User`:** Represents a user in the system. Includes fields for username, email, hashed password, admin status, active status, registration token, creation timestamp, and update timestamp.
    -   **`RegistrationToken`:** Represents a token used for user registration. Includes fields for the token, description, creator, usage status, creation timestamp, and expiration timestamp.
    -   **`APIKey`:** Represents an API key for custom applications. Includes fields for the key, description, associated user ID, priority, active status, creation timestamp, and last used timestamp.
    - **`SetupToken`:** Represents a token used for initial admin account creation.
    - **`ActivityLog`:** Logs admin actions for auditing purposes.

    See `backend/app/auth/models.py` for the complete model definitions.

2.  **Utility Functions (`backend/app/auth/utils.py`):**

    Utility functions for password hashing, verification, JWT token creation/validation, and API key validation are provided in `backend/app/auth/utils.py`. Key functions include:

    -   `get_password_hash(password)`: Hashes a password.
    -   `verify_password(plain_password, hashed_password)`: Verifies a password against a hash.
    -   `create_access_token(data, expires_delta=None)`: Creates a JWT token.
    -   `get_current_user(token, db)`: Validates a JWT token and returns the user.
    -   `get_current_active_user(current_user)`: Checks if a user is active.
    -   `get_current_admin_user(current_user)`: Checks if a user is an admin.
    -   `validate_api_key(api_key, db)`: Validates an API key.

3.  **Authentication Router (`backend/app/auth/router.py`):**

    The authentication router handles user registration, login, and related functionalities. Key endpoints include:

    -   `/auth/admin/setup`: Creates the initial admin account (using a setup token).
    -   `/auth/admin/setup-status`: Checks if admin setup is required.
    -   `/auth/admin/fetch-setup-token`: Retrieves the current admin setup token.
    -   `/auth/admin/login`: Authenticates an admin user and returns a JWT.
    -   `/auth/register`: Registers a new user (with a valid registration token).
    -   `/auth/token`: Authenticates a user and returns a JWT.
    -   `/auth/users/me`: Retrieves the current user's information.
    -   `/auth/tokens`: Creates and lists registration tokens (admin only).
    -   `/auth/apikeys`: Creates, lists, and deletes API keys (admin only).
    -   `/auth/users`: Lists all users (admin only).
    -   `/auth/users/{user_id}`: Deletes a user (admin only).
    - `/auth/activities`: Lists recent activity logs (admin only).

    See `backend/app/auth/router.py` for the complete implementation.

4.  **Integration with FastAPI (`backend/app/main.py`):**

    The authentication router is integrated into the main FastAPI application in `backend/app/main.py`. CORS (Cross-Origin Resource Sharing) is also configured here.

5.  **Database Connection (`backend/app/db.py`):**

    Database connection and session management are handled in `backend/app/db.py`. The `get_db` function provides a database session for use in API endpoints.

6.  **Admin Panel Integration:**

    The admin panel uses the authentication endpoints to manage users, registration tokens, and API keys.

7.  **Web Interface Authentication:**

    The web interface uses the `/register` and `/token` endpoints for user registration and login.

8.  **API Key Authentication (for Custom Applications):**

    API key authentication is implemented for custom applications, as detailed in `04_api_gateway.md`.