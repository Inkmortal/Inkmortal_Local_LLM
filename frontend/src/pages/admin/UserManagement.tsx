import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { fetchUsers, deleteUser, User } from './AdminDashboardData';

interface UserManagementProps {
  currentRoute?: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentRoute }) => {
  const { currentTheme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  // Fetch users on component mount
  useEffect(() => {
    loadUsers();
  }, []);
  
  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  // Handle user delete
  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowConfirmDelete(true);
  };
  
  // Confirm user delete
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setLoading(true);
      const success = await deleteUser(userToDelete.id);
      
      if (success) {
        // Update users list
        setUsers(users.filter(u => u.id !== userToDelete.id));
        setError(null);
      } else {
        setError('Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('An error occurred while deleting the user');
    } finally {
      setLoading(false);
      setShowConfirmDelete(false);
      setUserToDelete(null);
    }
  };
  
  // Cancel delete
  const cancelDelete = () => {
    setShowConfirmDelete(false);
    setUserToDelete(null);
  };
  
  // Check if a user is the last admin
  const isLastAdmin = (user: User) => {
    if (!user.is_admin) return false;
    
    const adminCount = users.filter(u => u.is_admin).length;
    return adminCount <= 1;
  };
  
  return (
    <div className="mb-8 pb-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
          User Management
        </h1>
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
      
      {/* Confirm Delete Modal */}
      {showConfirmDelete && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-4" style={{ color: currentTheme.colors.error }}>
              Confirm Delete
            </h2>
            <p className="mb-4" style={{ color: currentTheme.colors.textPrimary }}>
              Are you sure you want to delete user <strong>{userToDelete.username}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="secondary"
                onClick={cancelDelete}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDeleteUser}
              >
                Delete User
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {/* Users List */}
      <Card title="Users">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-t-transparent rounded-full mb-2"
              style={{ borderColor: `${currentTheme.colors.accentPrimary}40`, borderTopColor: 'transparent' }}
            />
            <p style={{ color: currentTheme.colors.textSecondary }}>Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8" style={{ color: currentTheme.colors.textSecondary }}>
            No users found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full" style={{ color: currentTheme.colors.textPrimary }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}` }}>
                  <th className="p-3 text-left font-medium">Username</th>
                  <th className="p-3 text-left font-medium">Email</th>
                  <th className="p-3 text-left font-medium">Created</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Role</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr 
                    key={user.id}
                    style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}30` }}
                  >
                    <td className="p-3">{user.username}</td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">{formatDate(user.created_at)}</td>
                    <td className="p-3">
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: user.is_active ? 
                            `${currentTheme.colors.success}20` : `${currentTheme.colors.error}20`,
                          color: user.is_active ? 
                            currentTheme.colors.success : currentTheme.colors.error
                        }}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: user.is_admin ? 
                            `${currentTheme.colors.warning}20` : `${currentTheme.colors.info}20`,
                          color: user.is_admin ? 
                            currentTheme.colors.warning : currentTheme.colors.info
                        }}
                      >
                        {user.is_admin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteUser(user)}
                        disabled={isLastAdmin(user)}
                        title={isLastAdmin(user) ? "Cannot delete the last admin user" : ""}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default UserManagement;