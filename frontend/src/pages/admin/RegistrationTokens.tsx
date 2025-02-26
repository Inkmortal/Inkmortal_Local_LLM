import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

interface Token {
  id: number;
  token: string;
  created: string;
  expires: string | null;
  used: boolean;
  usedBy: string | null;
  usedOn: string | null;
}

const RegistrationTokens: React.FC = () => {
  const { currentTheme } = useTheme();
  const [newTokenGenerated, setNewTokenGenerated] = useState<string | null>(null);
  const [expiryDays, setExpiryDays] = useState<number>(30);
  
  // Mock data for tokens
  const [tokens, setTokens] = useState<Token[]>([
    { 
      id: 1, 
      token: 'TKN_a1b2c3d4e5f6', 
      created: '2025-02-10', 
      expires: '2025-03-10', 
      used: true, 
      usedBy: 'user@example.com', 
      usedOn: '2025-02-15' 
    },
    { 
      id: 2, 
      token: 'TKN_f6e5d4c3b2a1', 
      created: '2025-02-15', 
      expires: '2025-03-15', 
      used: false, 
      usedBy: null, 
      usedOn: null 
    },
    { 
      id: 3, 
      token: 'TKN_1a2b3c4d5e6f', 
      created: '2025-02-20', 
      expires: '2025-03-20', 
      used: false, 
      usedBy: null, 
      usedOn: null 
    },
    { 
      id: 4, 
      token: 'TKN_6f5e4d3c2b1a', 
      created: '2025-02-25', 
      expires: null, 
      used: false, 
      usedBy: null, 
      usedOn: null 
    }
  ]);

  // Generate a new token
  const generateToken = () => {
    // In a real application, this would make an API call
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = 'TKN_';
    for (let i = 0; i < 12; i++) {
      token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    const today = new Date();
    let expires: string | null = null;
    
    if (expiryDays > 0) {
      const expiryDate = new Date(today);
      expiryDate.setDate(today.getDate() + expiryDays);
      expires = expiryDate.toISOString().split('T')[0];
    }
    
    const newToken: Token = {
      id: tokens.length + 1,
      token,
      created: today.toISOString().split('T')[0],
      expires,
      used: false,
      usedBy: null,
      usedOn: null
    };
    
    setTokens([newToken, ...tokens]);
    setNewTokenGenerated(token);
  };

  // Revoke a token
  const revokeToken = (id: number) => {
    // In a real application, this would make an API call
    setTokens(tokens.filter(token => token.id !== id));
  };

  // Copy token to clipboard
  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token);
    // In a real application, we would show a toast notification
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
          Registration Tokens
        </h1>
        <div className="mt-2 sm:mt-0">
          <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
            Tokens for inviting new users to register
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generate Token Card */}
        <Card title="Generate Registration Token" className="lg:col-span-1">
          <div className="space-y-4">
            {newTokenGenerated && (
              <div 
                className="p-3 rounded-md break-all"
                style={{ backgroundColor: `${currentTheme.colors.success}20` }}
              >
                <p className="text-sm font-medium mb-1" style={{ color: currentTheme.colors.success }}>
                  New token generated!
                </p>
                <div className="flex items-center justify-between">
                  <span style={{ color: currentTheme.colors.textPrimary }}>{newTokenGenerated}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newTokenGenerated)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}

            <div>
              <label 
                htmlFor="expiry-days" 
                className="block mb-1"
                style={{ color: currentTheme.colors.textSecondary }}
              >
                Expiry (days)
              </label>
              <div className="flex items-center">
                <input
                  id="expiry-days"
                  type="number"
                  min="0"
                  max="365"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                  className="w-full p-2 rounded-md border"
                  style={{
                    backgroundColor: currentTheme.colors.bgTertiary,
                    color: currentTheme.colors.textPrimary,
                    borderColor: currentTheme.colors.borderColor
                  }}
                />
                <span className="ml-2 text-sm" style={{ color: currentTheme.colors.textMuted }}>
                  (0 = never expires)
                </span>
              </div>
            </div>

            <Button 
              onClick={generateToken} 
              fullWidth
              style={{
                backgroundColor: currentTheme.colors.accentPrimary
              }}
            >
              Generate Token
            </Button>

            <div className="p-3 rounded-md" style={{ backgroundColor: `${currentTheme.colors.bgTertiary}40` }}>
              <h3 className="text-sm font-medium mb-2" style={{ color: currentTheme.colors.textSecondary }}>
                Registration Token Notes
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-sm" style={{ color: currentTheme.colors.textMuted }}>
                <li>Tokens can be used only once</li>
                <li>Expired tokens cannot be used for registration</li>
                <li>Send tokens to users via a secure channel</li>
                <li>Tokens are case-sensitive</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Token List Card */}
        <Card title="Active Tokens" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}` }}>
                  <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Token</th>
                  <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Created</th>
                  <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Expires</th>
                  <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Status</th>
                  <th className="text-right py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tokens.length === 0 ? (
                  <tr style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}` }}>
                    <td colSpan={5} className="py-4 text-center" style={{ color: currentTheme.colors.textMuted }}>
                      No registration tokens available
                    </td>
                  </tr>
                ) : (
                  tokens.map((token) => (
                    <tr 
                      key={token.id} 
                      style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}` }}
                    >
                      <td className="py-3 px-4 font-mono">{token.token}</td>
                      <td className="py-3 px-4">{token.created}</td>
                      <td className="py-3 px-4">
                        {token.expires || (
                          <span style={{ color: currentTheme.colors.textMuted }}>Never</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {token.used ? (
                          <div>
                            <span 
                              className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{ 
                                backgroundColor: `${currentTheme.colors.error}20`,
                                color: currentTheme.colors.error
                              }}
                            >
                              Used
                            </span>
                            {token.usedBy && (
                              <div className="text-xs mt-1" style={{ color: currentTheme.colors.textMuted }}>
                                by {token.usedBy}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span 
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: `${currentTheme.colors.success}20`,
                              color: currentTheme.colors.success
                            }}
                          >
                            Available
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!token.used && (
                          <Button 
                            variant="danger" 
                            size="sm" 
                            onClick={() => revokeToken(token.id)}
                          >
                            Revoke
                          </Button>
                        )}
                        {token.used && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled
                          >
                            Used
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

export default RegistrationTokens;