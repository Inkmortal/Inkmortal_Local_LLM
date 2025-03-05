import React, { useState, useEffect } from 'react';
import { fetchIPWhitelist, addIPWhitelistEntry, deleteIPWhitelistEntry, getClientIP } from '../../services/admin';
import { IPWhitelistEntry } from '../../types/AdminTypes';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const IPWhitelist: React.FC = () => {
  const { currentTheme } = useTheme();
  const [newIP, setNewIP] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isValidIP, setIsValidIP] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [ipList, setIpList] = useState<IPWhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fetchingClientIP, setFetchingClientIP] = useState(false);
  const [addingIP, setAddingIP] = useState(false);
  
  // Fetch IP whitelist data on component mount
  useEffect(() => {
    loadIpWhitelist();
  }, []);
  
  const loadIpWhitelist = async () => {
    try {
      setLoading(true);
      const data = await fetchIPWhitelist();
      setIpList(data);
      setApiError(null);
    } catch (err) {
      console.error('Error loading IP whitelist:', err);
      setApiError('Failed to load IP whitelist. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch client IP address from the server and fill the input field
  const fetchClientIP = async () => {
    try {
      setFetchingClientIP(true);
      
      const ip = await getClientIP();
      
      if (ip) {
        setNewIP(ip);
        setIsValidIP(validateIP(ip));
        setErrorMessage('');
      } else {
        setErrorMessage('Failed to fetch your IP address. Please enter it manually.');
      }
    } catch (error) {
      console.error('Error fetching client IP:', error);
      setErrorMessage('Failed to fetch your IP address. Please enter it manually.');
    } finally {
      setFetchingClientIP(false);
    }
  };

  // Validate IP address format
  const validateIP = (ip: string) => {
    // IPv4 regex pattern
    const ipv4Pattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    // IPv6 simplified pattern (not fully compliant but good enough for basic validation)
    const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)$/;
    
    return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
  };

  // Handle IP input change
  const handleIPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewIP(value);
    
    // Only validate if there's input
    if (value.trim()) {
      setIsValidIP(validateIP(value));
    } else {
      setIsValidIP(true); // Don't show error for empty input
    }
    
    setErrorMessage('');
  };

  // Handle description input change
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewDescription(e.target.value);
    setErrorMessage('');
  };

  // Add new IP address to whitelist
  const handleAddIP = async () => {
    // Validate input
    if (!newIP.trim()) {
      setErrorMessage('Please enter an IP address');
      return;
    }
    
    if (!isValidIP) {
      setErrorMessage('Please enter a valid IP address');
      return;
    }
    
    if (!newDescription.trim()) {
      setErrorMessage('Please enter a description');
      return;
    }
    
    try {
      setAddingIP(true);
      
      // Add the IP to whitelist - backend API only requires IP address
      const result = await addIPWhitelistEntry(newIP);
      
      if (result) {
        // Clear form and refresh list
        setNewIP('');
        setNewDescription('');
        await loadIpWhitelist();
        setErrorMessage('');
      } else {
        setErrorMessage('Failed to add IP to whitelist');
      }
    } catch (error) {
      console.error('Error adding IP to whitelist:', error);
      setErrorMessage('An error occurred while adding the IP to whitelist');
    } finally {
      setAddingIP(false);
    }
  };

  // Remove IP from whitelist
  const handleRemoveIP = async (id: string) => {
    try {
      setLoading(true);
      const success = await deleteIPWhitelistEntry(id);
      
      if (success) {
        await loadIpWhitelist();
      } else {
        setApiError('Failed to remove IP address');
      }
    } catch (error) {
      console.error('Error removing IP from whitelist:', error);
      setApiError('An error occurred while removing the IP address');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="mb-8 pb-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
          IP Whitelist Management
        </h1>
      </div>
      
      {/* Form to add new IP */}
      <Card title="Add IP Address" className="mb-6">
        <div className="space-y-4">
          <div>
            <label 
              htmlFor="ip-address" 
              className="block mb-1 font-medium"
              style={{ color: currentTheme.colors.textSecondary }}
            >
              IP Address
            </label>
            <div className="flex">
              <input
                id="ip-address"
                type="text"
                value={newIP}
                onChange={handleIPChange}
                placeholder="Enter IP address (e.g. 192.168.1.1)"
                className={`flex-grow p-2 rounded-l-md border ${!isValidIP ? 'border-red-500' : ''}`}
                style={{
                  backgroundColor: currentTheme.colors.bgTertiary,
                  color: currentTheme.colors.textPrimary,
                  borderColor: isValidIP ? currentTheme.colors.borderColor : currentTheme.colors.error,
                }}
              />
              <Button
                onClick={fetchClientIP}
                disabled={fetchingClientIP}
                className="rounded-l-none"
              >
                {fetchingClientIP ? 'Detecting...' : 'Use My IP'}
              </Button>
            </div>
            {!isValidIP && (
              <p className="mt-1 text-sm" style={{ color: currentTheme.colors.error }}>
                Please enter a valid IP address
              </p>
            )}
          </div>
          
          <div>
            <label 
              htmlFor="ip-description" 
              className="block mb-1 font-medium"
              style={{ color: currentTheme.colors.textSecondary }}
            >
              Description
            </label>
            <input
              id="ip-description"
              type="text"
              value={newDescription}
              onChange={handleDescriptionChange}
              placeholder="Enter a description (e.g. Home Office)"
              className="w-full p-2 rounded-md border"
              style={{
                backgroundColor: currentTheme.colors.bgTertiary,
                color: currentTheme.colors.textPrimary,
                borderColor: currentTheme.colors.borderColor,
              }}
            />
          </div>
          
          {errorMessage && (
            <div 
              className="p-3 rounded-md"
              style={{
                backgroundColor: `${currentTheme.colors.error}20`,
                color: currentTheme.colors.error,
              }}
            >
              {errorMessage}
            </div>
          )}
          
          <div className="flex justify-end">
            <Button
              onClick={handleAddIP}
              disabled={addingIP || !isValidIP}
              className="px-4"
            >
              {addingIP ? 'Adding...' : 'Add to Whitelist'}
            </Button>
          </div>
        </div>
      </Card>
      
      {/* IP Whitelist Table */}
      <Card title="Current Whitelist">
        {apiError && (
          <div 
            className="mb-4 p-3 rounded-md"
            style={{
              backgroundColor: `${currentTheme.colors.error}20`,
              color: currentTheme.colors.error,
            }}
          >
            {apiError}
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-t-transparent rounded-full mb-2"
              style={{ borderColor: `${currentTheme.colors.accentPrimary}40`, borderTopColor: 'transparent' }}
            />
            <p style={{ color: currentTheme.colors.textSecondary }}>Loading IP whitelist...</p>
          </div>
        ) : (
          ipList.length === 0 ? (
            <div className="text-center py-8" style={{ color: currentTheme.colors.textSecondary }}>
              No IP addresses in whitelist. Add your first one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full" style={{ color: currentTheme.colors.textPrimary }}>
                <thead>
                  <tr style={{ 
                    backgroundColor: currentTheme.colors.bgTertiary,
                    borderBottom: `1px solid ${currentTheme.colors.borderColor}`,
                  }}>
                    <th className="p-3 text-left font-medium">IP Address</th>
                    <th className="p-3 text-left font-medium">Description</th>
                    <th className="p-3 text-left font-medium">Added On</th>
                    <th className="p-3 text-left font-medium">Last Used</th>
                    <th className="p-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ipList.map((item) => (
                    <tr 
                      key={item.id}
                      style={{ 
                        borderBottom: `1px solid ${currentTheme.colors.borderColor}30`,
                      }}
                    >
                      <td className="p-3 font-mono">{item.ip}</td>
                      <td className="p-3">IP Whitelist Entry</td>
                      <td className="p-3">{formatDate(item.added)}</td>
                      <td className="p-3">{item.lastUsed ? formatDate(item.lastUsed) : 'Never'}</td>
                      <td className="p-3">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveIP(item.id)}
                          className="px-2 py-1 text-xs"
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>
    </div>
  );
};

export default IPWhitelist;