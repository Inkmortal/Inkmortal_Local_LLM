# Admin Panel Implementation

## Overview
This document outlines the steps to create the React-based administration panel. The admin panel will allow administrators to manage users, API keys, the IP whitelist, and system settings. It will also provide monitoring dashboards.

## Steps

1.  **Component Structure:**

    *Task Description:* Create the basic React component structure for the admin panel within the `frontend/src/pages/` directory. This will include the main `Admin.tsx` component and any necessary subcomponents.

    ```
    frontend/
    └── src/
        └── pages/
            └── Admin.tsx  # Main admin panel component
            └── components/
                ├── IPWhitelist.tsx
                ├── RegistrationTokens.tsx
                ├── APIKeys.tsx
                ├── SystemStats.tsx
                └── ...
    ```

2.  **Basic `Admin.tsx`:**

    *Task Description:* Create the main `Admin.tsx` component with a basic layout and placeholders for the different management sections (IP Whitelist, Registration Tokens, API Keys, System Stats).

    ```typescript
    // frontend/src/pages/Admin.tsx
    import React from 'react';
    import IPWhitelist from './components/IPWhitelist';
    import RegistrationTokens from './components/RegistrationTokens';
    import APIKeys from './components/APIKeys';
    import SystemStats from './components/SystemStats';

    export function AdminPanel() {
      return (
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>

          <IPWhitelist />
          <RegistrationTokens />
          <APIKeys />
          <SystemStats />
        </div>
      );
    }
    ```

3.  **Authentication (Planning):**

    *Task Description:* Implement basic authentication for the admin panel. This will likely involve using JWT tokens and a login form. The specifics of the authentication implementation are detailed in `03_authentication.md`. The admin panel should be designed to require authentication before displaying any sensitive information or allowing any administrative actions.

4.  **API Integration (Planning):**

    *Task Description:*  This step involves creating the necessary API endpoints in the backend (FastAPI) to support the functionality of the admin panel components. These endpoints will handle adding/removing IPs from the whitelist, generating/revoking registration tokens, managing API keys, and providing system statistics. This is detailed in the `04_api_gateway.md` implementation plan. The frontend components should be designed with these API interactions in mind.

5.  **`IPWhitelist` Component:**

    *Task Description:* Create the `IPWhitelist` component to manage the IP whitelist. This component will allow administrators to add and remove IP addresses from the whitelist. It will interact with a backend API endpoint (defined in the API Gateway implementation).

    ```typescript
    // frontend/src/pages/components/IPWhitelist.tsx
    import React, { useState } from 'react';

    export default function IPWhitelist() {
      const [newIP, setNewIP] = useState('');
      const [whitelist, setWhitelist] = useState<string[]>([]); // Fetch from API

      const addIP = () => {
        // Call API to add IP
        setNewIP('');
      };

      const removeIP = (ip: string) => {
        // Call API to remove IP
      };

      return (
        <div className="mb-8">
          <h2 className="text-xl mb-2">IP Whitelist</h2>
          <div className="flex gap-2 mb-4">
            <input
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              className="border p-2 rounded"
              placeholder="Enter IP address"
            />
            <button
              onClick={addIP}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Add IP
            </button>
          </div>
          <ul className="space-y-2">
            {whitelist.map((ip) => (
              <li key={ip} className="flex justify-between items-center">
                <span>{ip}</span>
                <button onClick={() => removeIP(ip)} className="text-red-500">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    ```

6.  **`RegistrationTokens` Component:**

    *Task Description:* Create the `RegistrationTokens` component to manage registration tokens. This component will allow administrators to generate new tokens and see a list of existing tokens (with their usage status). It will interact with a backend API endpoint.

    ```typescript
    // frontend/src/pages/components/RegistrationTokens.tsx
    import React, { useState } from 'react';

    export default function RegistrationTokens() {
      const [newToken, setNewToken] = useState(''); // Generated token
      const [tokens, setTokens] = useState<{ token: string; used: boolean }[]>(
        []
      ); // Fetch from API

      const generateToken = () => {
        // Call API to generate token
      };

      return (
        <div className="mb-8">
          <h2 className="text-xl mb-2">Registration Tokens</h2>
          <button
            onClick={generateToken}
            className="bg-green-500 text-white px-4 py-2 rounded mb-4"
          >
            Generate Token
          </button>
          {newToken && (
            <p className="mb-4">
              New Token: <code>{newToken}</code>
            </p>
          )}
          <ul className="space-y-2">
            {tokens.map((t) => (
              <li key={t.token} className="flex justify-between items-center">
                <span>{t.token}</span>
                <span>{t.used ? 'Used' : 'Available'}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    ```

7.  **`APIKeys` Component:**

     *Task Description:* Create the `APIKeys` component to manage API keys.  This will allow admins to create, view, and revoke API keys, as well as see their associated priorities and usage statistics.  It will interact with backend API endpoints.

    ```typescript
    // frontend/src/pages/components/APIKeys.tsx

    import React, { useState } from 'react';

    export default function APIKeys() {
        const [newKeyName, setNewKeyName] = useState('');
        const [newKeyPriority, setNewKeyPriority] = useState(2); // Default priority
        const [keys, setKeys] = useState<{key: string; name: string; priority: number; active: boolean}[]>([]) // Fetch from API

        const createKey = () => {
            // Call API to create key
        }

        const revokeKey = (key: string) => {
            // Call API to revoke key
        }

        return (
            <div className="mb-8">
                <h2 className="text-xl mb-2">API Keys</h2>
                <div className="flex gap-2 mb-4">
                    <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Application Name" className="border p-2 rounded" />
                    <input type="number" value={newKeyPriority} onChange={e => setNewKeyPriority(parseInt(e.target.value))} className="border p-2 rounded w-20" />
                    <button onClick={createKey} className="bg-blue-500 text-white px-4 py-2 rounded">Create Key</button>
                </div>
                <ul>
                    {keys.map(k => (
                        <li key={k.key} className="flex justify-between items-center">
                            <span>{k.name} ({k.key}) - Priority: {k.priority}</span>
                            <button onClick={() => revokeKey(k.key)} className="text-red-500">Revoke</button>
                        </li>
                    ))}
                </ul>
            </div>
        )
    }
    ```

8.  **`SystemStats` Component:**

    *Task Description:* Create a placeholder `SystemStats` component that will eventually display system statistics and monitoring data.  This will be fleshed out in the "Monitoring" implementation phase.

    ```typescript
    // frontend/src/pages/components/SystemStats.tsx
    import React from 'react';

    export default function SystemStats() {
      return (
        <div className="mb-8">
          <h2 className="text-xl mb-2">System Statistics</h2>
          <p>Statistics will be displayed here.</p>
        </div>
      );
    }
    ```

9. **Styling:**

    *Task Description:* Apply Tailwind CSS classes to style the admin panel components, ensuring a consistent and user-friendly interface.

10. **API Configuration & Backend Connectivity:**

    *Task Description:* Create a dedicated API configuration module to ensure reliable connectivity between the frontend and backend. This centralized approach provides better error handling and consistent API access across components.

    ```typescript
    // frontend/src/config/api.ts
    export const API_BASE_URL = 'http://localhost:8000';

    export const fetchApi = async (endpoint: string, options = {}) => {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`Fetching from: ${url}`);
      
      try {
        const response = await fetch(url, options);
        return response;
      } catch (error) {
        console.error(`Network error:`, error);
        throw new Error(`Cannot connect to backend server at ${API_BASE_URL}. Please check if the server is running.`);
      }
    };
    ```

11. **Authentication Context Enhancement:**

    *Task Description:* Improve the AuthContext to better handle connection failures and provide clear error messages to users. Enhance the integration with API configuration.
    
    Key improvements:
    - Add connection status tracking
    - Provide explicit error messages for backend connectivity issues
    - Implement better token handling and refresh logic
    - Improve development mode experience with fallback offline authentication

12. **Admin Setup Flow Improvement:**

    *Task Description:* Simplify the admin setup flow and improve the user experience for the first-time setup process. Make the secret question more prominent and ensure clear visibility of registration tokens.
    
    Key improvements:
    - Automatically show the secret question section when needed
    - Provide clearer error messages for connection failures
    - Improve visual presentation of the setup token

13. **CORS Configuration:**

    *Task Description:* Update the backend CORS settings to ensure proper connectivity with the frontend development server. This is critical for local development as well as production deployment.
    
    ```python
    # backend/app/config.py
    self.allowed_origins = [
        f"https://chat.{self.base_domain}",
        f"https://admin.{self.base_domain}",
        "http://localhost:3000",  # Frontend dev server
        "http://127.0.0.1:3000",  # Alternative frontend address
        "http://localhost:8000",  # Backend dev server
        "http://127.0.0.1:8000",  # Alternative backend address
    ]
    ```

## Implementation Challenges

Several challenges were encountered during the implementation of the admin panel:

1. **API Connection Issues:**
   - Using relative URLs without specifying the base URL caused connection failures
   - Lack of proper error handling obscured the root causes of connectivity issues
   - Solution: Created a dedicated API configuration module with explicit base URL and error handling

2. **Route Inconsistency:**
   - Mismatched route paths between App.tsx, ThemeSelector, and Sidebar components
   - Route defined as "admin/theme" in some places and "admin/themes" in others
   - Solution: Standardized all routes to "admin/theme" for consistency

3. **Admin Login UX:**
   - Poor placement of admin login button made it difficult to find
   - Inadequate error messages when backend connection failed
   - Solution: Moved login button to the header and improved error feedback

4. **Authentication Flow Issues:**
   - Lack of proper connection status reporting in authentication context
   - No fallback for development mode when backend is unavailable
   - Solution: Enhanced AuthContext with connection status and better error handling

These challenges highlight the importance of:
- Consistent routing conventions
- Centralized API configuration
- Clear error messages and status reporting
- Fallback mechanisms for development scenarios