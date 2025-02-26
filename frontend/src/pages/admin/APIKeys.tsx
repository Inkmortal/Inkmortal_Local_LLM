import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

interface APIKey {
  id: number;
  key: string;
  name: string;
  priority: number;
  created: string;
  lastUsed: string | null;
  usageCount: number;
  active: boolean;
}

const priorityLabels = {
  1: { name: 'High (Direct API)', description: 'For coding tools and direct Ollama API access' },
  2: { name: 'Medium (Custom Apps)', description: 'For custom applications with moderate priority' },
  3: { name: 'Low (Web Interface)', description: 'For web interface users and lower priority applications' }
};

const APIKeys: React.FC = () => {
  const { currentTheme } = useTheme();
  
  // Form state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPriority, setNewKeyPriority] = useState(2);
  const [newKeyGenerated, setNewKeyGenerated] = useState<{ name: string; key: string } | null>(null);
  
  // Mock data for API keys
  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    { 
      id: 1, 
      key: 'API_ab12cd34ef56gh78', 
      name: 'Development Environment', 
      priority: 2, 
      created: '2025-01-15', 
      lastUsed: '2025-02-26', 
      usageCount: 1452,
      active: true 
    },
    { 
      id: 2, 
      key: 'API_ij90kl12mn34op56', 
      name: 'Production App', 
      priority: 1, 
      created: '2025-01-20', 
      lastUsed: '2025-02-25', 
      usageCount: 8734,
      active: true 
    },
    { 
      id: 3, 
      key: 'API_qr78st90uv12wx34', 
      name: 'Testing Suite', 
      priority: 3, 
      created: '2025-02-01', 
      lastUsed: '2025-02-20', 
      usageCount: 256,
      active: true 
    },
    { 
      id: 4, 
      key: 'API_yz56ab78cd90ef12', 
      name: 'Legacy Application', 
      priority: 2, 
      created: '2025-01-10', 
      lastUsed: '2025-02-15', 
      usageCount: 1898,
      active: false 
    }
  ]);

  // Validate form
  const isFormValid = () => {
    return newKeyName.trim().length > 0;
  };

  // Create a new API key
  const createKey = () => {
    if (!isFormValid()) return;
    
    // In a real application, this would make an API call
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'API_';
    for (let i = 0; i < 16; i++) {
      key += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    const newKey: APIKey = {
      id: apiKeys.length + 1,
      key,
      name: newKeyName,
      priority: newKeyPriority,
      created: today,
      lastUsed: null,
      usageCount: 0,
      active: true
    };
    
    setApiKeys([newKey, ...apiKeys]);
    setNewKeyGenerated({ name: newKeyName, key });
    setNewKeyName('');
  };

  // Revoke an API key
  const revokeKey = (id: number) => {
    // In a real application, this would make an API call
    setApiKeys(
      apiKeys.map(key => 
        key.id === id 
          ? { ...key, active: false } 
          : key
      )
    );
  };

  // Reactivate an API key
  const reactivateKey = (id: number) => {
    // In a real application, this would make an API call
    setApiKeys(
      apiKeys.map(key => 
        key.id === id 
          ? { ...key, active: true } 
          : key
      )
    );
  };

  // Copy key to clipboard
  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    // In a real application, we would show a toast notification
  };

  // Get the priority color based on priority level
  const getPriorityColor = (priority: number) => {
    switch(priority) {
      case 1: return currentTheme.colors.error;
      case 2: return currentTheme.colors.accentPrimary;
      case 3: return currentTheme.colors.accentTertiary;
      default: return currentTheme.colors.textMuted;
    }
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
          API Keys Management
        </h1>
        <div className="mt-2 sm:mt-0">
          <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
            API keys for custom applications with configurable priority levels
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Key Form */}
        <Card title="Create API Key" className="lg:col-span-1">
          <div className="space-y-4">
            {newKeyGenerated && (
              <div 
                className="p-3 rounded-md break-all"
                style={{ backgroundColor: `${currentTheme.colors.success}20` }}
              >
                <p className="text-sm font-medium mb-1" style={{ color: currentTheme.colors.success }}>
                  New API key generated for {newKeyGenerated.name}!
                </p>
                <p className="text-xs mb-2" style={{ color: currentTheme.colors.textMuted }}>
                  Save this key now. It won't be shown again.
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm break-all" style={{ color: currentTheme.colors.textPrimary }}>
                    {newKeyGenerated.key}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newKeyGenerated.key)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}

            <div>
              <label 
                htmlFor="app-name" 
                className="block mb-1"
                style={{ color: currentTheme.colors.textSecondary }}
              >
                Application Name
              </label>
              <input
                id="app-name"
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Development Environment"
                className="w-full p-2 rounded-md border mb-4"
                style={{
                  backgroundColor: currentTheme.colors.bgTertiary,
                  color: currentTheme.colors.textPrimary,
                  borderColor: currentTheme.colors.borderColor
                }}
              />

              <label 
                htmlFor="priority" 
                className="block mb-1"
                style={{ color: currentTheme.colors.textSecondary }}
              >
                Priority Level
              </label>
              <select
                id="priority"
                value={newKeyPriority}
                onChange={(e) => setNewKeyPriority(parseInt(e.target.value))}
                className="w-full p-2 rounded-md border"
                style={{
                  backgroundColor: currentTheme.colors.bgTertiary,
                  color: currentTheme.colors.textPrimary,
                  borderColor: currentTheme.colors.borderColor
                }}
              >
                <option value={1}>1 - High Priority (Direct API)</option>
                <option value={2}>2 - Medium Priority (Custom Apps)</option>
                <option value={3}>3 - Low Priority (Web Interface)</option>
              </select>
              <p className="mt-1 text-sm" style={{ color: currentTheme.colors.textMuted }}>
                {priorityLabels[newKeyPriority as keyof typeof priorityLabels].description}
              </p>
            </div>

            <Button 
              onClick={createKey} 
              disabled={!isFormValid()}
              fullWidth
              style={{
                backgroundColor: currentTheme.colors.accentPrimary
              }}
            >
              Create API Key
            </Button>

            <div className="p-3 rounded-md" style={{ backgroundColor: `${currentTheme.colors.bgTertiary}40` }}>
              <h3 className="text-sm font-medium mb-2" style={{ color: currentTheme.colors.textSecondary }}>
                API Key Notes
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-sm" style={{ color: currentTheme.colors.textMuted }}>
                <li>API keys are subject to queue priority rules</li>
                <li>Higher priority keys are processed before lower priority ones</li>
                <li>Keys can be revoked at any time if compromised</li>
                <li>Usage is tracked for monitoring purposes</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* API Keys List */}
        <Card title="API Keys" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}` }}>
                  <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Name</th>
                  <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Priority</th>
                  <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Created</th>
                  <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Usage</th>
                  <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Status</th>
                  <th className="text-right py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.length === 0 ? (
                  <tr style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}` }}>
                    <td colSpan={6} className="py-4 text-center" style={{ color: currentTheme.colors.textMuted }}>
                      No API keys available
                    </td>
                  </tr>
                ) : (
                  apiKeys.map((key) => (
                    <tr 
                      key={key.id} 
                      style={{ 
                        borderBottom: `1px solid ${currentTheme.colors.borderColor}`,
                        opacity: key.active ? 1 : 0.6
                      }}
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium">{key.name}</div>
                        <div className="text-xs font-mono mt-1 truncate max-w-xs" style={{ color: currentTheme.colors.textMuted }}>
                          {key.key}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: `${getPriorityColor(key.priority)}20`,
                            color: getPriorityColor(key.priority)
                          }}
                        >
                          {priorityLabels[key.priority as keyof typeof priorityLabels].name}
                        </span>
                      </td>
                      <td className="py-3 px-4">{key.created}</td>
                      <td className="py-3 px-4">
                        <div>{key.usageCount.toLocaleString()} requests</div>
                        <div className="text-xs mt-1" style={{ color: currentTheme.colors.textMuted }}>
                          Last used: {key.lastUsed || 'Never'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {key.active ? (
                          <span 
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: `${currentTheme.colors.success}20`,
                              color: currentTheme.colors.success
                            }}
                          >
                            Active
                          </span>
                        ) : (
                          <span 
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: `${currentTheme.colors.error}20`,
                              color: currentTheme.colors.error
                            }}
                          >
                            Revoked
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {key.active ? (
                          <Button 
                            variant="danger" 
                            size="sm" 
                            onClick={() => revokeKey(key.id)}
                          >
                            Revoke
                          </Button>
                        ) : (
                          <Button 
                            variant="success" 
                            size="sm"
                            onClick={() => reactivateKey(key.id)}
                          >
                            Reactivate
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default APIKeys;