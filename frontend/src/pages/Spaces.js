import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import axios from 'axios';
import { Plus, Users, Building, Home, UserPlus, X, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import UserSearch from '../components/UserSearch';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Spaces() {
  const navigate = useNavigate();
  const { getAuthHeaders, currentUser, loading: authLoading } = useAuth();
  const { loadNotifications } = useNotifications();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [spaceMembers, setSpaceMembers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    type: 'personal'
  });

  const loadSpaces = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    try {
      const headers = await getAuthHeaders();
      if (!headers || !headers.Authorization) {
        console.error('Failed to get auth headers');
        toast.error('Authentication error. Please try logging in again.');
        setLoading(false);
        return;
      }
      const response = await axios.get(`${API}/spaces`, { headers });
      setSpaces(response.data);
    } catch (error) {
      console.error('Failed to load spaces:', error);
      // Don't redirect on error, just show error message
      if (error.response?.status === 401) {
        toast.error('Authentication expired. Please refresh the page.');
      } else {
        toast.error('Failed to load spaces');
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser, getAuthHeaders]);

  useEffect(() => {
    // Wait for auth to be ready before loading spaces
    if (!authLoading && currentUser) {
      loadSpaces();
    } else if (!authLoading && !currentUser) {
      // Auth is ready but no user - this shouldn't happen due to PrivateRoute, but handle it
      setLoading(false);
    }
  }, [authLoading, currentUser, loadSpaces]);


  const handleAddSpace = async () => {
    if (!formData.name) {
      toast.error('Space name is required');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      await axios.post(
        `${API}/spaces`,
        formData,
        { headers }
      );

      toast.success('Space created successfully');
      setIsAddDialogOpen(false);
      setFormData({ name: '', type: 'personal' });
      await loadSpaces();
      // Refresh notifications after space creation
      await loadNotifications();
    } catch (error) {
      console.error('Failed to create space:', error);
      toast.error('Failed to create space');
    }
  };

  const handleManageSpace = async (space) => {
    setSelectedSpace(space);
    setIsManageDialogOpen(true);
    // Load space members
    await loadSpaceMembers(space.spaceId);
  };

  const loadSpaceMembers = async (spaceId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API}/spaces`, { headers });
      const space = response.data.find(s => s.spaceId === spaceId);
      if (space) {
        // Fetch member details by userId directly
        const memberPromises = space.members.map(async (memberId) => {
          try {
            // Get user by ID directly instead of searching
            const userResponse = await axios.get(`${API}/users/${memberId}`, { headers });
            return userResponse.data;
          } catch (error) {
            console.error(`Failed to fetch user ${memberId}:`, error);
            // Fallback: try to get from Firebase Auth or return minimal info
            return {
              userId: memberId,
              email: memberId.includes('@') ? memberId : 'Unknown Email',
              displayName: 'Unknown User',
              photoURL: ''
            };
          }
        });
        const members = await Promise.all(memberPromises);
        setSpaceMembers(members);
      }
    } catch (error) {
      console.error('Failed to load space members:', error);
      toast.error('Failed to load space members');
    }
  };

  const handleAddMember = async (user) => {
    if (!selectedSpace) return;
    
    try {
      const headers = await getAuthHeaders();
      await axios.post(
        `${API}/spaces/${selectedSpace.spaceId}/members`,
        { userId: user.userId },
        { headers }
      );
      
      toast.success(`${user.displayName || user.email} added to space`);
      await loadSpaceMembers(selectedSpace.spaceId);
      await loadSpaces();
      // Refresh notifications after adding member
      await loadNotifications();
    } catch (error) {
      console.error('Failed to add member:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to add member';
      toast.error(errorMessage);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!selectedSpace) return;
    
    if (!window.confirm('Are you sure you want to remove this member from the space?')) {
      return;
    }
    
    try {
      const headers = await getAuthHeaders();
      await axios.delete(
        `${API}/spaces/${selectedSpace.spaceId}/members/${memberId}`,
        { headers }
      );
      
      toast.success('Member removed from space');
      await loadSpaceMembers(selectedSpace.spaceId);
      await loadSpaces();
      // Refresh notifications after removing member
      await loadNotifications();
    } catch (error) {
      console.error('Failed to remove member:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to remove member';
      toast.error(errorMessage);
    }
  };

  // Memoize excludeUserIds to prevent infinite loops
  const excludeUserIds = useMemo(() => 
    selectedSpace ? [selectedSpace.ownerId, ...(selectedSpace.members || [])] : [],
    [selectedSpace?.ownerId, selectedSpace?.members]
  );

  const getSpaceIcon = (type) => {
    switch (type) {
      case 'family':
        return <Users className="w-8 h-8" />;
      case 'work':
        return <Building className="w-8 h-8" />;
      default:
        return <Home className="w-8 h-8" />;
    }
  };

  const getSpaceColor = (type) => {
    switch (type) {
      case 'family':
        return 'from-blue-500 to-blue-600';
      case 'work':
        return 'from-green-500 to-green-600';
      default:
        return 'from-purple-500 to-purple-600';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="spaces-page">
        {/* Header */}
        <div className="glass rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Spaces</h1>
              <p className="text-gray-600">Organize and share your passwords across different spaces</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                data-testid="add-space-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Space
              </Button>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Space</DialogTitle>
                  <DialogDescription>
                    Create a new space to organize and share passwords with others.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Space Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Family Vault, Work Passwords"
                      data-testid="space-name-input"
                    />
                  </div>
                  <div>
                    <Label>Space Type</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger data-testid="space-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="family">Family</SelectItem>
                        <SelectItem value="work">Work/Team</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleAddSpace} 
                    className="w-full"
                    data-testid="save-space-btn"
                  >
                    Create Space
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Info Banner */}
        <div className="glass rounded-2xl p-6 shadow-lg border-2 border-blue-200">
          <h3 className="font-bold mb-2">About Spaces</h3>
          <p className="text-sm text-gray-600">
            Spaces help you organize passwords by context. Create separate spaces for personal, family, or work passwords. 
            Family and work spaces can be shared with others.
          </p>
        </div>

        {/* Spaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map((space, index) => (
            <motion.div
              key={space.spaceId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-2xl p-6 shadow-lg hover:shadow-xl smooth-transition"
              data-testid={`space-card-${index}`}
            >
              <div 
                onClick={() => navigate(`/spaces/${space.spaceId}`)}
                className="cursor-pointer"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getSpaceColor(space.type)} text-white flex items-center justify-center mb-4`}>
                  {getSpaceIcon(space.type)}
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-800">{space.name}</h3>
                <p className="text-sm text-gray-600 capitalize mb-4">{space.type} Space</p>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                  <span>Members</span>
                  <span className="font-medium">{space.members?.length || 0} member{(space.members?.length || 0) !== 1 ? 's' : ''}</span>
                </div>
              </div>
              {space.ownerId === currentUser?.userId && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManageSpace(space);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Manage Members
                </Button>
              )}
            </motion.div>
          ))}
        </div>

        {spaces.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold mb-2">No spaces yet</h3>
            <p className="text-gray-600">Create your first space to organize your passwords</p>
          </div>
        )}

        {/* Manage Space Members Dialog */}
        <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Manage Space Members</DialogTitle>
              <DialogDescription>
                {selectedSpace && `Add or remove members from "${selectedSpace.name}"`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* User Search */}
              <div>
                <Label>Add Member</Label>
                <UserSearch
                  onSelectUser={handleAddMember}
                  excludeUserIds={excludeUserIds}
                />
              </div>

              {/* Current Members */}
              <div>
                <Label>Current Members</Label>
                <div className="mt-2 space-y-2">
                  {spaceMembers.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">No members yet</p>
                  ) : (
                    spaceMembers.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={member.photoURL} />
                            <AvatarFallback>
                              {member.displayName?.[0] || member.email?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {member.displayName || 'No name'}{currentUser?.userId === member.userId ? ' (Me)' : ''}
                            </p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        {selectedSpace?.ownerId === currentUser?.userId && (
                          <Button
                            onClick={() => handleRemoveMember(member.userId)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}