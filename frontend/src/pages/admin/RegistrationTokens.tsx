import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { fetchRegistrationTokens, createRegistrationToken, deleteRegistrationToken } from '../../services/admin';

// Interface matches the API response format
interface Token {
  id: string;
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
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load tokens from API
  useEffect(() => {
    const loadTokens = async () => {
      try {
        setLoading(true);
        const data = await fetchRegistrationTokens();
        setTokens(data);
        setError(null);
      } catch (err) {
        console.error('Error loading registration tokens:', err);
        setError('Failed to load registration tokens');
      } finally {
        setLoading(false);
      }
    };

    loadTokens();
  }, []);

  // Generate a new token
  const generateToken = async () => {
    try {
      const description = `Registration token (${new Date().toLocaleDateString()})`;
      const newToken = await createRegistrationToken(description, expiryDays);
      if (newToken) {
        setTokens([newToken, ...tokens]);
        setNewTokenGenerated(newToken.token);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error generating token:', err);
      setError(`Failed to generate token: ${err.message}`);
    }
  };

  // Revoke a token
  const revokeToken = async (id: string) => {
    try {
      await deleteRegistrationToken(id);
      setTokens(tokens.filter(token => token.id !== id));
      setError(null);
    } catch (err: any) {
      console.error('Error revoking token:', err);
      setError(`Failed to revoke token: ${err.message}`);
    }
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
                <p className="text-xs font-mono">{newTokenGenerated}</p>
                <button
                  className="mt-2 text-xs font-medium"
                  style={{ color: currentTheme.colors.accentPrimary }}
                  onClick={() => copyToClipboard(newTokenGenerated)}
                >
                  Copy to clipboard
                </button>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: currentTheme.colors.textSecondary }}>
                Expires after (days)
              </label>
              <input
                type="number"
                value={expiryDays}
                onChange={(e) => setExpiryDays(parseInt(e.target.value) || 0)}
                min="0"
                max="365"
                className="w-full p-2 rounded-md border"
                style={{
                  backgroundColor: currentTheme.colors.bgTertiary,
                  color: currentTheme.colors.textPrimary,
                  borderColor: currentTheme.colors.borderColor,
                }}
              />
              <p className="text-xs" style={{ color: currentTheme.colors.textMuted }}>
                Set to 0 for tokens that never expire
              </p>
            </div>

            <Button
              onClick={generateToken}
              fullWidth
              style={{
                backgroundColor: currentTheme.colors.accentPrimary
              }}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Generate Token'}
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
                            variant="danger" 
                            size="sm"
                            onClick={() => revokeToken(token.id)}
                          >
                            Delete
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