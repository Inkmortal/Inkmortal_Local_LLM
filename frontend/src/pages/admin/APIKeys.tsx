import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { fetchApiKeys, createApiKey, deleteApiKey } from '../../services/admin';
import { ApiKey } from '../../types/AdminTypes';

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
  const [newKey, setNewKey] = useState<string | null>(null);
  
  // Data state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showKeyForm, setShowKeyForm] = useState(false);
  
  // Fetch API keys on component mount
  useEffect(() => {
    loadApiKeys();
  }, []);
  
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
  
  // Create a new API key
  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      setError('Please enter a description for the API key');
      return;
    }
    
    try {
      setLoading(true);
      const result = await createApiKey(newKeyName, newKeyPriority);
      
      if (result) {
        // Store new key for display
        setNewKey(result.key);
        
        // Reset form
        setNewKeyName('');
        setNewKeyPriority(2);
        
        // Reload list
        await loadApiKeys();
        setError(null);
        setShowKeyForm(false);
      } else {
        setError('Failed to create API key');
      }
    } catch (err) {
      console.error('Error creating API key:', err);
      setError('An error occurred while creating the API key');
    } finally {
      setLoading(false);
    }
  };
  
  // Revoke an API key
  const revokeKey = async (id: string) => {
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
    alert('API key copied to clipboard!'); // In a real app, use a toast notification
  };
  
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
          API Keys Management
        </h1>
        <div className="mt-2 sm:mt-0">
          <Button 
            onClick={() => setShowKeyForm(!showKeyForm)}
            style={{
              backgroundColor: currentTheme.colors.accentPrimary
            }}
          >
            {showKeyForm ? 'Cancel' : 'Create New API Key'}
          </Button>
        </div>
      </div>
      
      {error && (
        <div 
          className="mb-6 p-3 rounded-md"
          style={{
            backgroundColor: `${currentTheme.colors.error}20`,
            color: currentTheme.colors.error,
          }}
        >
          {error}
        </div>
      )}
      
      {/* New key success message */}
      {newKey && (
        <Card className="mb-6 border-2" style={{ borderColor: currentTheme.colors.success }}>
          <div className="space-y-3">
            <h3 className="text-lg font-bold" style={{ color: currentTheme.colors.success }}>
              New API Key Created!
            </h3>
            <p className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
              This key will only be shown once. Please copy it now and store it securely.
            </p>
            <div className="p-3 rounded-md break-all font-mono bg-black bg-opacity-10">
              {newKey}
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => copyToClipboard(newKey)}
                style={{
                  backgroundColor: currentTheme.colors.success
                }}
              >
                Copy Key
              </Button>
              <Button 
                onClick={() => setNewKey(null)}
                className="ml-2"
                variant="secondary"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {/* Create key form */}
      {showKeyForm && !newKey && (
        <Card title="Create New API Key" className="mb-6">
          <div className="space-y-4">
            <div>
              <label 
                htmlFor="key-description" 
                className="block mb-1 font-medium"
                style={{ color: currentTheme.colors.textSecondary }}
              >
                Description
              </label>
              <input
                id="key-description"
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Enter a description (e.g. Web Application API Access)"
                className="w-full p-2 rounded-md border"
                style={{
                  backgroundColor: currentTheme.colors.bgTertiary,
                  color: currentTheme.colors.textPrimary,
                  borderColor: currentTheme.colors.borderColor,
                }}
              />
              <p className="mt-1 text-xs" style={{ color: currentTheme.colors.textMuted }}>
                A clear description will help you identify this key later
              </p>
            </div>
            
            <div>
              <label 
                className="block mb-1 font-medium"
                style={{ color: currentTheme.colors.textSecondary }}
              >
                Priority Level
              </label>
              
              <div className="space-y-2">
                {Object.entries(priorityLabels).map(([priority, { name, description }]) => (
                  <div 
                    key={priority}
                    className="flex items-start"
                  >
                    <input
                      type="radio"
                      id={`priority-${priority}`}
                      name="priority"
                      value={priority}
                      checked={newKeyPriority === Number(priority)}
                      onChange={() => setNewKeyPriority(Number(priority))}
                      className="mt-1 mr-2"
                    />
                    <label htmlFor={`priority-${priority}`} className="cursor-pointer">
                      <span className="font-medium block" style={{ color: currentTheme.colors.textPrimary }}>{name}</span>
                      <span className="text-sm block" style={{ color: currentTheme.colors.textMuted }}>{description}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleCreateKey}
                disabled={loading || !newKeyName.trim()}
                style={{
                  backgroundColor: currentTheme.colors.accentPrimary
                }}
              >
                {loading ? 'Creating...' : 'Create API Key'}
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {/* API Keys Table */}
      <Card title="Existing API Keys">
        {loading && !newKey ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-t-transparent rounded-full mb-2"
              style={{ borderColor: `${currentTheme.colors.accentPrimary}40`, borderTopColor: 'transparent' }}
            />
            <p style={{ color: currentTheme.colors.textSecondary }}>Loading API keys...</p>
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-8" style={{ color: currentTheme.colors.textSecondary }}>
            No API keys found. Create your first one by clicking the button above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}30` }}>
                  <th className="text-left py-3 px-3" style={{ color: currentTheme.colors.textSecondary }}>Description</th>
                  <th className="text-left py-3 px-3" style={{ color: currentTheme.colors.textSecondary }}>Priority</th>
                  <th className="text-left py-3 px-3" style={{ color: currentTheme.colors.textSecondary }}>Created</th>
                  <th className="text-left py-3 px-3" style={{ color: currentTheme.colors.textSecondary }}>Last Used</th>
                  <th className="text-left py-3 px-3" style={{ color: currentTheme.colors.textSecondary }}>Status</th>
                  <th className="text-left py-3 px-3" style={{ color: currentTheme.colors.textSecondary }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map(key => (
                  <tr key={key.id} style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}30` }}>
                    <td className="py-3 px-3" style={{ color: currentTheme.colors.textPrimary }}>
                      {key.description}
                    </td>
                    <td className="py-3 px-3" style={{ color: currentTheme.colors.textSecondary }}>
                      {priorityLabels[key.priority as keyof typeof priorityLabels]?.name || `Level ${key.priority}`}
                    </td>
                    <td className="py-3 px-3" style={{ color: currentTheme.colors.textSecondary }}>
                      {formatDate(key.created_at)}
                    </td>
                    <td className="py-3 px-3" style={{ color: currentTheme.colors.textSecondary }}>
                      {formatDate(key.last_used)}
                      {key.usage_count > 0 && (
                        <span className="ml-1 text-xs" style={{ color: currentTheme.colors.textMuted }}>
                          ({key.usage_count} uses)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: key.is_active ? 
                            `${currentTheme.colors.success}20` : `${currentTheme.colors.error}20`,
                          color: key.is_active ? 
                            currentTheme.colors.success : currentTheme.colors.error
                        }}
                      >
                        {key.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => revokeKey(key.id)}
                      >
                        Revoke
                      </Button>
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