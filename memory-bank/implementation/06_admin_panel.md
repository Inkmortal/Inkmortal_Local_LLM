# Admin Panel Implementation

## Overview

This document describes the implementation of the React-based administration panel for the Seadragon LLM system. The admin panel allows administrators to manage users, API keys, the IP whitelist, registration tokens, and system settings. It also provides monitoring dashboards.

## Implementation Details

The admin panel is built using React, TypeScript, and Tailwind CSS. It is located within the `frontend/` directory, specifically in the `frontend/src/components/admin/` subdirectory. It interacts with the backend API (FastAPI) to retrieve and update data.

**Key Features:**

-   **User Management:** List, create (via registration tokens), and delete users (with restrictions to prevent deleting the last admin or self-deletion).
-   **API Key Management:** Create, list, and revoke API keys. API keys have associated priorities and descriptions.
-   **IP Whitelist Management:** Add and remove IP addresses from the whitelist.
-   **Registration Token Management:** Generate and list registration tokens, including their usage status and expiration.
-   **System Statistics:** Display system statistics (CPU, memory, storage, uptime) and Ollama status (model, version, online/offline).
-   **Queue Monitoring:** Display queue statistics (queue size, processing requests, etc.).
-   **Activity Feed:** Shows recent admin activities (e.g., token creation, user deletion).
-   **Theme Customization:** Allows administrators to select and customize the application's theme.
-   **Model Management:** Allows administrators to select the active Ollama model from a list of available models.
- **Authentication:** Requires admin login using JWT authentication.

**Directory Structure:**

The `frontend/src/components/admin/` directory contains the following key components:

-   `ActivityFeed.tsx`: Displays recent activity logs.
-   `AutoRefreshToggle.tsx`: Toggle for automatic data refresh.
-   `CircularProgress.tsx`: Circular progress indicator.
-   `DashboardCards.tsx`: Displays summary cards for key metrics.
-   `DataTable.tsx`: Generic data table component.
-   `HealthCard.tsx`: Displays system health status.
-   `PriorityBadge.tsx`: Displays priority levels.
-   `ProgressBar.tsx`: Progress bar component.
-   `QueueServiceBadge.tsx`: Displays the status of the queue service.
-   `QueueStatusBadge.tsx`: Displays the status of a queue request.
-   `RefreshControls.tsx`: Controls for refreshing data.
-   `ResourceCard.tsx`: Generic card for displaying resource information.
-   `StatusBadge.tsx`: Displays status indicators.
-   `StatusCard.tsx`: Displays status information.
-   `StatusCounter.tsx`: Displays a count of items with a specific status.
-   `SystemStatsPanel.tsx`: Displays system statistics, including model selection.
-   `TabView.tsx`: Tabbed view component.
-   `TimeAgo.tsx`: Displays relative time (e.g., "5 minutes ago").
- `queue/`: Components specifically for queue monitoring.

**Key Components:**

-   **`SystemStatsPanel.tsx`:** Displays system statistics and provides the interface for model management.
-   **`DashboardCards.tsx`:** Displays summary cards for key metrics (IP whitelist count, registration token count, API key count, queue size).
-   **`ActivityFeed.tsx`:** Displays a list of recent admin activities.

**API Integration:**

The admin panel components interact with the following backend API endpoints:

-   `/auth/admin/login`: For admin login.
-   `/auth/users`: For listing users (admin only).
-   `/auth/users/{user_id}`: For deleting users (admin only).
-   `/auth/tokens`: For managing registration tokens (admin only).
-   `/auth/apikeys`: For managing API keys (admin only).
-   `/admin/ip_whitelist`: (Now located at `backend/app/admin/ip_whitelist.py`) For managing the IP whitelist (admin only).
-   `/admin/queue_monitor`: (Now located at `backend/app/admin/queue_monitor.py`) For queue monitoring (admin only).
-   `/admin/system_stats`: (Now located at `backend/app/admin/system_stats.py`) For system statistics (admin only).
- `/api/models`: For listing available Ollama models.
- `/admin/stats`: For fetching dashboard statistics.

**Dependencies:**

-   `react`: Core React library.
-   `react-router-dom`: For routing.
-   `@tanstack/react-query`: For data fetching and caching.
-   `typescript`: For type safety.
-   `vite`: For building and bundling the application.
-   `tailwindcss`: For styling.
-   `axios`: For making HTTP requests.

**Next Steps:**

-   The admin panel is largely complete, but ongoing maintenance and improvements are expected.
- Connect queue visualization to actual queue state.
