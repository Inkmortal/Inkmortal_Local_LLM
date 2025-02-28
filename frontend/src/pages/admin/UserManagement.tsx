import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { fetchUsers, deleteUser } from './AdminDashboardData';

// Interface for User data
interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserManagementProps {
  currentRoute?: string;
}

const UserManagement: React.FC<UserManagementProps> = () => {
  const { currentTheme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load users on component mount
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const usersData = await fetchUsers();
        setUsers(usersData);
      } catch (err) {
        setError('Failed to load users. Please try again later.');
        console.error('Error loading users:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadUsers();
  }, []);

  // Format date string to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Handle user deletion
  const handleDeleteUser = async (userId: number) => {
    if (confirmDelete !== userId) {
      setConfirmDelete(userId);
      return;
    }
    
    setDeletingUserId(userId);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await deleteUser(userId);
      
      // Update users list
      setUsers(users.filter(user => user.id !== userId));
      setSuccessMessage('User deleted successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setDeletingUserId(null);
      setConfirmDelete(null);
    }
  };

  // Cancel delete confirmation
  const cancelDelete = () => {
    setConfirmDelete(null);
  };

  return (
    <div 
      className="p-6"
      style={{ color: currentTheme.colors.textPrimary }}
    >
      <div className="mb-6">
        <h1 
          className="text-2xl font-bold mb-2"
          style={{ color: currentTheme.colors.accentPrimary }}
        >
          User Management
        </h1>
        <p style={{ color: currentTheme.colors.textSecondary }}>
          Manage user accounts and access permissions
        </p>
      </div>
      
      {/* Messages */}
      {error && (
        <div 
          className="mb-4 p-3 rounded-md"
          style={{
            backgroundColor: `${currentTheme.colors.error}20`,
            color: currentTheme.colors.error,
            border: `1px solid ${currentTheme.colors.error}40`
          }}
        >
          {error}
        </div>
      )}
      
      {successMessage && (
        <div 
          className="mb-4 p-3 rounded-md"
          style={{
            backgroundColor: `${currentTheme.colors.success}20`,
            color: currentTheme.colors.success,
            border: `1px solid ${currentTheme.colors.success}40`
          }}
        >
          {successMessage}
        </div>
      )}
      
      {/* Users List */}
      <Card className="w-full overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div 
                className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                style={{ borderColor: `${currentTheme.colors.accentPrimary}40`, borderTopColor: 'transparent' }}
              ></div>
              <p>Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center" style={{ color: currentTheme.colors.textMuted }}>
              <p>No users found</p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr style={{ backgroundColor: currentTheme.colors.bgSecondary }}>
                  <th className="py-3 px-4 text-left font-medium text-sm" style={{ color: currentTheme.colors.textSecondary }}>ID</th>
                  <th className="py-3 px-4 text-left font-medium text-sm" style={{ color: currentTheme.colors.textSecondary }}>Username</th>
                  <th className="py-3 px-4 text-left font-medium text-sm" style={{ color: currentTheme.colors.textSecondary }}>Email</th>
                  <th className="py-3 px-4 text-left font-medium text-sm" style={{ color: currentTheme.colors.textSecondary }}>Role</th>
                  <th className="py-3 px-4 text-left font-medium text-sm" style={{ color: currentTheme.colors.textSecondary }}>Status</th>
                  <th className="py-3 px-4 text-left font-medium text-sm" style={{ color: currentTheme.colors.textSecondary }}>Created</th>
                  <th className="py-3 px-4 text-left font-medium text-sm" style={{ color: currentTheme.colors.textSecondary }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr 
                    key={user.id} 
                    className="border-t"
                    style={{ borderColor: `${currentTheme.colors.borderColor}40` }}
                  >
                    <td className="py-3 px-4">{user.id}</td>
                    <td className="py-3 px-4 font-medium">{user.username}</td>
                    <td className="py-3 px-4">{user.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-block px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: user.is_admin 
                            ? `${currentTheme.colors.warning}20` 
                            : `${currentTheme.colors.success}20`,
                          color: user.is_admin 
                            ? currentTheme.colors.warning 
                            : currentTheme.colors.success
                        }}
                      >
                        {user.is_admin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-block px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: user.is_active 
                            ? `${currentTheme.colors.success}20` 
                            : `${currentTheme.colors.error}20`,
                          color: user.is_active 
                            ? currentTheme.colors.success 
                            : currentTheme.colors.error
                        }}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm" style={{ color: currentTheme.colors.textMuted }}>
                      {formatDate(user.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      {confirmDelete === user.id ? (
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={deletingUserId === user.id}
                          >
                            {deletingUserId === user.id ? 'Deleting...' : 'Confirm'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelDelete}
                            disabled={deletingUserId === user.id}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteUser(user.id)}
                          style={{ color: currentTheme.colors.error }}
                          disabled={deletingUserId !== null || user.is_admin}
                          title={user.is_admin ? "Can't delete admin users" : "Delete user"}
                        >
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
      
      <div className="mt-6 text-sm" style={{ color: currentTheme.colors.textMuted }}>
        <p>Note: Admin users cannot be deleted through this interface. The last admin account cannot be deleted.</p>
      </div>
    </div>
  );
};

export default UserManagement;