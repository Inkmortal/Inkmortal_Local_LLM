# Monitoring Implementation

## Overview

This document describes the monitoring and logging implementation for the Seadragon LLM system. The system tracks various metrics and events to provide insights into its performance, health, and usage.

## Monitored Metrics and Events

The following metrics and events are currently monitored:

-   **System Statistics:**
    -   CPU usage (percentage)
    -   Memory usage (percentage)
    -   Disk usage (percentage) - *Not directly displayed, but collected*
    -   System uptime
-   **Queue Statistics:**
    -   Queue size (total and per-priority)
    -   Number of requests being processed
    -   Total requests
    -   Completed requests
    -   Failed requests
    -   Average wait time
    -   Average processing time
-   **Request Statistics:**
    -   Total request count
    -   Average request processing time
    -   Error count and rate
    -   Most frequent endpoints
-   **Ollama Status:**
    -   Online/Offline status
    -   Current model
    -   Version (currently a placeholder)
-   **Recent Activities:**
    -   Admin actions (e.g., token creation, user deletion, API key management)

## Display and Access

The monitored data is primarily displayed in the admin panel's System Stats dashboard and Activity Feed.  API endpoints are available for retrieving this data programmatically.

## Implementation Details

### System Statistics

-   System statistics (CPU, memory, uptime) are collected periodically using the `psutil` library (if available).
-   The collected data is stored in the `SystemMetric` model (`backend/app/admin/models.py`).
-   The `backend/app/admin/system_stats.py` file contains the logic for fetching and formatting system statistics for the admin panel.
-   The `SystemStatsPanel.tsx` component in the frontend displays the system statistics.

### Queue Statistics

-   Queue statistics are tracked by the `RabbitMQManager` (`backend/app/queue/rabbitmq/manager.py`) and its associated `RequestProcessor` (`backend/app/queue/rabbitmq/processor.py`).
-   The `QueueStats` model (`backend/app/queue/models.py`) defines the structure for storing queue statistics.
-   The `get_status()` method of the `RabbitMQManager` returns the current queue status, including queue sizes and connection status.
-   The admin panel's `DashboardCards` and `SystemStatsPanel` components display queue statistics.

### Request Statistics

-   Individual request details (path, method, status code, processing time, user, API key, client IP, timestamp) are logged to the `RequestLog` model (`backend/app/auth/models.py`).
-   The `backend/app/admin/stats.py` file contains logic for aggregating request statistics (counts, average times, error rates) over different time periods.
-   The admin panel's `DashboardCards` and `SystemStatsPanel` components display request statistics.

### Ollama Status

-   Ollama's online/offline status is checked via the API Gateway's health check (`/api/health` in `backend/app/api/gateway.py`).
-   The current model is retrieved from the backend configuration and displayed in the admin panel.
-   The `SystemStatsPanel` component displays the Ollama status.

### Recent Activities

-   Admin actions are logged to the `ActivityLog` model (`backend/app/auth/models.py`).
-   The `backend/app/auth/activities.py` file provides the `log_activity` function for logging activities.
-   The `ActivityFeed.tsx` component in the admin panel displays recent activities.

### Logging

-   The application uses Python's built-in `logging` module.
-   Log messages are output to the console and to a rotating log file (`logs/seadragon.log`).
-   Log levels (INFO, WARNING, ERROR) are used to categorize log messages.
-   The `backend/app/main.py` file includes middleware to log all incoming requests and their processing times.

## Alerting

-   Alerting is not yet implemented.  Future implementations could include sending email notifications or integrating with monitoring services based on thresholds for system metrics, queue length, or error rates.

## API Endpoints

The following API endpoints provide access to monitoring data:

-   `/admin/stats`: Retrieves overall dashboard statistics (requires admin authentication).
-   `/admin/stats/requests`: Retrieves request statistics for a specific period (requires admin authentication).
-   `/admin/stats/system`: Retrieves system metrics for a specific period (requires admin authentication).
-   `/api/queue/status`: Retrieves the current queue status (requires authentication).
-   `/api/health`: Checks the health of the API Gateway (Ollama and RabbitMQ).
- `/auth/activities`: Retrieves recent activity logs (admin only).