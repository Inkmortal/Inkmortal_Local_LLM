import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const IPWhitelist: React.FC = () => {
  const { currentTheme } = useTheme();
  const [newIP, setNewIP] = useState('');
  const [isValidIP, setIsValidIP] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Mock data for IP whitelist
  const [ipList, setIpList] = useState([
    { id: 1, ip: '192.168.1.100', added: '2025-02-20', lastUsed: '2025-02-26' },
    { id: 2, ip: '192.168.1.101', added: '2025-02-21', lastUsed: '2025-02-25' },
    { id: 3, ip: '192.168.1.102', added: '2025-02-22', lastUsed: '2025-02-24' },
    { id: 4, ip: '10.0.0.15', added: '2025-02-23', lastUsed: '2025-02-26' },
    { id: 5, ip: '10.0.0.16', added: '2025-02-24', lastUsed: null }
  ]);

  // Validate IP address format
  const validateIP = (ip: string) => {
    // Simple regex for IPv4 validation
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  };

  // Handle IP input change
  const handleIPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewIP(value);
    
    if (value.trim() === '') {
      setIsValidIP(true);
      setErrorMessage('');
      return;
    }
    
    const valid = validateIP(value);
    setIsValidIP(valid);
    setErrorMessage(valid ? '' : 'Please enter a valid IPv4 address');
  };

  // Add IP to whitelist
  const addIP = () => {
    if (!newIP.trim() || !isValidIP) {
      return;
    }
    
    // Check if IP already exists
    if (ipList.some(item => item.ip === newIP)) {
      setIsValidIP(false);
      setErrorMessage('This IP is already in the whitelist');
      return;
    }
    
    // In a real application, this would make an API call
    const today = new Date().toISOString().split('T')[0];
    const newItem = {
      id: ipList.length + 1,
      ip: newIP,
      added: today,
      lastUsed: null
    };
    
    setIpList([...ipList, newItem]);
    setNewIP('');
    setIsValidIP(true);
    setErrorMessage('');
  };

  // Remove IP from whitelist
  const removeIP = (id: number) => {
    // In a real application, this would make an API call
    setIpList(ipList.filter(item => item.id !== id));
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
          IP Whitelist Management
        </h1>
        <div className="mt-2 sm:mt-0">
          <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
            Direct API access is restricted to whitelisted IP addresses
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add IP Form */}
        <Card title="Add IP Address" className="lg:col-span-1">
          <div className="space-y-4">
            <div>
              <label 
                htmlFor="ip-address" 
                className="block mb-1"
                style={{ color: currentTheme.colors.textSecondary }}
              >
                IP Address (IPv4)
              </label>
              <div className="flex items-center">
                <input
                  id="ip-address"
                  type="text"
                  value={newIP}
                  onChange={handleIPChange}
                  placeholder="e.g. 192.168.1.100"
                  className={`w-full p-2 rounded-md border ${!isValidIP ? 'border-red-500' : ''}`}
                  style={{
                    backgroundColor: currentTheme.colors.bgTertiary,
                    color: currentTheme.colors.textPrimary,
                    borderColor: isValidIP ? currentTheme.colors.borderColor : currentTheme.colors.error
                  }}
                />
                <Button 
                  onClick={addIP} 
                  disabled={!newIP.trim() || !isValidIP}
                  className="ml-2"
                >
                  Add
                </Button>
              </div>
              {errorMessage && (
                <p className="mt-1 text-sm" style={{ color: currentTheme.colors.error }}>
                  {errorMessage}
                </p>
              )}
            </div>

            <div className="p-3 rounded-md" style={{ backgroundColor: `${currentTheme.colors.bgTertiary}40` }}>
              <h3 className="text-sm font-medium mb-2" style={{ color: currentTheme.colors.textSecondary }}>
                IP Whitelist Notes
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-sm" style={{ color: currentTheme.colors.textMuted }}>
                <li>Only IPv4 addresses are currently supported</li>
                <li>CIDR notation (e.g., 192.168.1.0/24) is not supported</li>
                <li>Whitelisted IPs have direct access to the Ollama API</li>
                <li>Use API Keys for non-whitelisted access scenarios</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* IP Whitelist Table */}
        <Card title="Current Whitelist" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}` }}>
                  <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>IP Address</th>
                  <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Date Added</th>
                  <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Last Used</th>
                  <th className="text-right py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ipList.length === 0 ? (
                  <tr style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}` }}>
                    <td colSpan={4} className="py-4 text-center" style={{ color: currentTheme.colors.textMuted }}>
                      No IP addresses in whitelist
                    </td>
                  </tr>
                ) : (
                  ipList.map((item) => (
                    <tr 
                      key={item.id} 
                      style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}` }}
                    >
                      <td className="py-3 px-4">{item.ip}</td>
                      <td className="py-3 px-4">{item.added}</td>
                      <td className="py-3 px-4">
                        {item.lastUsed || (
                          <span style={{ color: currentTheme.colors.textMuted }}>Never</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button 
                          variant="danger" 
                          size="sm" 
                          onClick={() => removeIP(item.id)}
                        >
                          Remove
                        </Button>
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

export default IPWhitelist;