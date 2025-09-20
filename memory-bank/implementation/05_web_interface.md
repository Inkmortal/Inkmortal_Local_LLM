# Web Interface Implementation

## Overview

This document describes the implementation of the React-based web interface for the Seadragon LLM system. This interface provides a chat-based interaction with the LLM, focusing on an educational, "tutor-like" experience.

## Implementation Details

The web interface is built using React, TypeScript, Tailwind CSS, and Vite. It communicates with the backend API (FastAPI) to authenticate users, send chat messages, and receive responses.

**Key Features:**

-   **User Authentication:** Supports user registration and login using JWT tokens.
-   **Chat Interface:** Provides a responsive chat window for interacting with the LLM.
-   **Streaming Responses:** Supports streaming responses from the LLM for a more interactive experience.
-   **Message Formatting:**
    -   **Math Rendering:** Supports LaTeX math rendering using MathJax.
    -   **Code Highlighting:** Supports syntax highlighting for various programming languages using `react-syntax-highlighter`.
-   **File Uploads:** Allows users to upload images and PDF files (primarily for textbook questions).
-   **Responsive Design:** Adapts to different screen sizes.
-   **Theme Support:** Supports multiple themes (though theme switching is primarily managed in the admin panel).
- **Protected Routes:** Ensures that only authenticated users can access the chat interface.

**Directory Structure:**

The `frontend/src/` directory contains the following key subdirectories and files:

-   `components/`: Reusable React components.
    -   `auth/`: Components for login and registration forms (`LoginForm.tsx`, `RegisterForm.tsx`, `UserProfile.tsx`).
    -   `chat/`: Components for the chat interface (`ChatWindow.tsx`, `ChatMessage.tsx`, `ChatInput.tsx`, `AssistantAvatar.tsx`, `MessageParser.tsx`).
    -   `education/`: Components for educational features (`CodeBlock.tsx`, `MathRenderer.tsx`, `FileUpload.tsx`).
    -   `layout/`: Components for layout (e.g., `Navbar.tsx`, `Sidebar.tsx`).
    -   `themes/`: Components and data related to theming.
    -   `ui/`: Generic UI components (e.g., `Button.tsx`, `Card.tsx`).
    - `admin/`: Components for the admin dashboard (separate from the main chat interface).
    - `artifacts/`: Components for managing and rendering artifacts (documents, images, etc.).
-   `pages/`: Top-level page components (e.g., `Home.tsx`, `Chat.tsx`, `Login.tsx`, `Register.tsx`).
-   `services/`: Services for interacting with the backend API (`api.ts`, `chatService.ts`, `mathService.ts`).
-   `config/`: Configuration files (e.g., `api.ts`).
-   `context/`: React context providers (e.g., `AuthContext.tsx`, `ThemeContext.tsx`).
-   `styles/`: CSS files.
-   `themes/`: CSS files for different themes.
-   `types/`: TypeScript type definitions.
-   `utils/`: Utility functions.
-   `App.tsx`: Main application component, including routing.
-   `index.tsx`: Entry point for the React application.
-   `routes.tsx`: Route definitions.
- `routes.constants.ts`: Route constants.

**Key Components:**

-   **`ChatWindow.tsx`:** The main component for the chat interface. It handles:
    -   Displaying chat messages.
    -   Sending user messages to the backend API.
    -   Receiving and displaying streaming responses from the LLM.
    -   Managing conversation history (currently limited, to be expanded).
    -   Integrating with other components (e.g., `ChatMessage`, `ChatInput`).
-   **`ChatMessage.tsx`:** Renders individual chat messages, including handling different message types (user, assistant) and rendering math, code, and attachments.
-   **`ChatInput.tsx`:** Provides the input field for users to type messages and includes file upload functionality.
-   **`CodeBlock.tsx`:** Renders code blocks with syntax highlighting.
-   **`MathRenderer.tsx`:** Renders LaTeX math expressions using MathJax.
-   **`FileUpload.tsx`:** Handles file uploads (images and PDFs).
-   **`LoginForm.tsx`:** Provides the login form.
-   **`RegisterForm.tsx`:** Provides the registration form.
-   **`App.tsx`:** Sets up routing and protected routes.

**API Integration:**

-   The frontend communicates with the backend API primarily through the `/api/chat/completions` endpoint (for sending messages and receiving responses) and the `/auth` endpoints (for authentication).
-   The `frontend/src/services/api.ts` file provides a configured `axios` instance for making API requests, including setting the authorization header with the JWT token.
-   The `frontend/src/services/chatService.ts` file provides functions for interacting with the chat-specific API endpoints.

**Dependencies:**

-   `react`: Core React library.
-   `react-router-dom`: For routing.
-   `@tanstack/react-query`: For data fetching and caching.
-   `typescript`: For type safety.
-   `vite`: For building and bundling the application.
-   `tailwindcss`: For styling.
-   `react-syntax-highlighter`: For code highlighting.
-   `axios`: For making HTTP requests.
- `html-to-markdown`: For converting HTML to Markdown.

**Next Steps:**

-   Fully connect the `ChatWindow` component to the backend API, replacing mock data with real API calls.
-   Implement robust conversation history and context window management.
-   Integrate backend artifact rendering for math and code.
-   Implement image and PDF upload handling.
-   Add LLM tool use capabilities.