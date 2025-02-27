import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { fetchApiKeys, createApiKey, deleteApiKey } from './AdminDashboardData';

interface APIKey {
  id: number;
  key: string;
  description: string;
  priority: number;
  created_at: string;
  last_used: string | null;
  usage_count: number;
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
  const [newKeyGenerated, setNewKeyGenerated] = useState<{ description: string; key: string } | null>(null);
  
  // API keys state
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load API keys on component mount
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        setLoading(true);
        const data = await fetchApiKeys();
        setApiKeys(data);
        setError(null);
      } catch (err) {
        console.error('Error loading API keys:', err);
        setError('Failed to load API keys. Please try again later.');
        setApiKeys([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadApiKeys();
  }, []);

  // Reset new key form
  const resetForm = () => {
    setNewKeyName('');
    setNewKeyPriority(2);
    setNewKeyGenerated(null);
  };

  // Create a new API key
  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      setError('Please enter a description for the API key');
      return;
    }
    
    try {
      setLoading(true);
      const result = await createApiKey(newKeyName, newKeyPriority);
      
      // Store the newly created key for display
      setNewKeyGenerated({
        description: newKeyName,
        key: result.key
      });
      
      // Refresh the list of API keys
      const updatedKeys = await fetchApiKeys();
      setApiKeys(updatedKeys);
      
      // Reset form
      setNewKeyName('');
      setError(null);
    } catch (err) {
      console.error('Error creating API key:', err);
      setError('Failed to create API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Revoke an API key
  const revokeKey = async (id: number) => {
    try {
      setLoading(true);
      await deleteApiKey(id);
      
      // Refresh the list of API keys
      const updatedKeys = await fetchApiKeys();
      setApiKeys(updatedKeys);
      
      setError(null);
    } catch (err) {
      console.error('Error revoking API key:', err);
      setError('Failed to revoke API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Copy key to clipboard
  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    // In a real application, we would show a toast notification
    alert('API key copied to clipboard');
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

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6" style={{ color: currentTheme.colors.accentPrimary }}>
        API Keys
      </h1>
      
      {/* Create new API key card */}
      <Card className="mb-8">
        <h2 className="text-xl font-semibold mb-4" style={{ color: currentTheme.colors.textPrimary }}>
          Create New API Key
        </h2>
        
        {error && (
          <div className="mb-4 p-3 rounded-md" style={{ backgroundColor: `${currentTheme.colors.error}20`, color: currentTheme.colors.error }}>
            {error}
          </div>
        )}
        
        {newKeyGenerated && (
          <div className="mb-6 p-4 rounded-md" style={{ backgroundColor: `${currentTheme.colors.success}20` }}>
            <h3 className="font-semibold mb-2" style={{ color: currentTheme.colors.success }}>
              API Key Created Successfully
            </h3>
            <p className="mb-2" style={{ color: currentTheme.colors.textPrimary }}>
              Your new API key for "{newKeyGenerated.description}" has been created. Please copy this key now as it won't be shown again.
            </p>
            <div className="flex items-center">
              <code 
                className="flex-1 p-2 rounded font-mono text-sm overflow-x-auto whitespace-nowrap"
                style={{ backgroundColor: currentTheme.colors.bgTertiary, color: currentTheme.colors.accentSecondary }}
              >
                {newKeyGenerated.key}
              </code>
              <button
                onClick={() => copyToClipboard(newKeyGenerated.key)}
                className="ml-2 p-2 rounded-md"
                style={{ backgroundColor: `${currentTheme.colors.accentSecondary}20`, color: currentTheme.colors.accentSecondary }}
                title="Copy to clipboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            </div>
            <button 
              onClick={resetForm}
              className="mt-4 px-4 py-2 rounded-md"
              style={{ backgroundColor: `${currentTheme.colors.accentPrimary}20`, color: currentTheme.colors.accentPrimary }}
            >
              Create Another Key
            </button>
          </div>
        )}
        
        {!newKeyGenerated && (
          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-medium" style={{ color: currentTheme.colors.textPrimary }}>
                Description
              </label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Development Environment"
                className="w-full p-2 rounded-md border"
                style={{ 
                  backgroundColor: currentTheme.colors.bgPrimary,
                  color: currentTheme.colors.textPrimary,
                  borderColor: currentTheme.colors.borderColor
                }}
              />
              <p className="mt-1 text-sm" style={{ color: currentTheme.colors.textMuted }}>
                Give this API key a clear description to remember what it's for
              </p>
            </div>
            
            <div>
              <label className="block mb-1 font-medium" style={{ color: currentTheme.colors.textPrimary }}>
                Priority Level
              </label>
              <select
                value={newKeyPriority}
                onChange={(e) => setNewKeyPriority(parseInt(e.target.value))}
                className="w-full p-2 rounded-md border"
                style={{ 
                  backgroundColor: currentTheme.colors.bgPrimary,
                  color: currentTheme.colors.textPrimary,
                  borderColor: currentTheme.colors.borderColor
                }}
              >
                {Object.entries(priorityLabels).map(([value, { name }]) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm" style={{ color: currentTheme.colors.textMuted }}>
                {priorityLabels[newKeyPriority as keyof typeof priorityLabels]?.description}
              </p>
            </div>
            
            <Button
              onClick={handleCreateKey}
              disabled={loading || !newKeyName.trim()}
              className="mt-2"
              style={{ 
                backgroundColor: currentTheme.colors.accentPrimary,
                color: '#ffffff',
                opacity: loading || !newKeyName.trim() ? 0.7 : 1
              }}
            >
              {loading ? 'Creating...' : 'Create API Key'}
            </Button>
          </div>
        )}
      </Card>
      
      {/* API keys list */}
      <Card>
        <h2 className="text-xl font-semibold mb-4" style={{ color: currentTheme.colors.textPrimary }}>
          Active API Keys
        </h2>
        
        {loading && !apiKeys.length ? (
          <div className="text-center py-8" style={{ color: currentTheme.colors.textMuted }}>
            Loading API keys...
          </div>
        ) : !apiKeys.length ? (
          <div className="text-center py-8" style={{ color: currentTheme.colors.textMuted }}>
            No API keys found. Create your first key above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}` }}>
                  <th className="py-2 px-3 text-left font-semibold" style={{ color: currentTheme.colors.textSecondary }}>Description</th>
                  <th className="py-2 px-3 text-left font-semibold" style={{ color: currentTheme.colors.textSecondary }}>Key</th>
                  <th className="py-2 px-3 text-left font-semibold" style={{ color: currentTheme.colors.textSecondary }}>Priority</th>
                  <th className="py-2 px-3 text-left font-semibold" style={{ color: currentTheme.colors.textSecondary }}>Created</th>
                  <th className="py-2 px-3 text-left font-semibold" style={{ color: currentTheme.colors.textSecondary }}>Last Used</th>
                  <th className="py-2 px-3 text-left font-semibold" style={{ color: currentTheme.colors.textSecondary }}>Usage</th>
                  <th className="py-2 px-3 text-right font-semibold" style={{ color: currentTheme.colors.textSecondary }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map(key => (
                  <tr key={key.id} style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}30` }}>
                    <td className="py-3 px-3" style={{ color: currentTheme.colors.textPrimary }}>
                      {key.description}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center">
                        <code 
                          className="font-mono text-xs"
                          style={{ color: currentTheme.colors.accentSecondary }}
                        >
                          {key.key.substring(0, 8)}...
                        </code>
                        <button
                          onClick={() => copyToClipboard(key.key)}
                          className="ml-2 p-1 rounded-md"
                          style={{ backgroundColor: `${currentTheme.colors.accentSecondary}10`, color: currentTheme.colors.accentSecondary }}
                          title="Copy to clipboard"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span 
                        className="px-2 py-1 rounded-md text-xs font-medium"
                        style={{ 
                          backgroundColor: `${getPriorityColor(key.priority)}20`,
                          color: getPriorityColor(key.priority)
                        }}
                      >
                        {priorityLabels[key.priority as keyof typeof priorityLabels]?.name.split(' ')[0]}
                      </span>
                    </td>
                    <td className="py-3 px-3" style={{ color: currentTheme.colors.textSecondary }}>
                      {formatDate(key.created_at)}
                    </td>
                    <td className="py-3 px-3" style={{ color: currentTheme.colors.textSecondary }}>
                      {formatDate(key.last_used)}
                    </td>
                    <td className="py-3 px-3" style={{ color: currentTheme.colors.textSecondary }}>
                      {key.usage_count} requests
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => revokeKey(key.id)}
                        className="px-3 py-1 rounded-md text-sm"
                        style={{ 
                          backgroundColor: `${currentTheme.colors.error}20`,
                          color: currentTheme.colors.error
                        }}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Layout>
  );
};

export default APIKeys;