import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Plus, Eye, EyeOff, Copy, Edit, Trash2, Key, Search, Filter, Share2, Home, Users, Building, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { encryptData, decryptData } from '../utils/encryption';
import { generatePassword, calculatePasswordStrength } from '../utils/passwordGenerator';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const CATEGORIES = ['Social', 'Banking', 'Work', 'Shopping', 'Email', 'Entertainment', 'Other'];

export default function Passwords() {
  const { getAuthHeaders, encryptionKey, currentUser } = useAuth();
  const [passwords, setPasswords] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null); // null means "All Spaces"
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState(new Set());
  
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    password: '',
    website: '',
    category: 'Other',
    notes: '',
    spaceId: 'personal'
  });

  const loadSpaces = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API}/spaces`, { headers });
      setSpaces(response.data);
    } catch (error) {
      console.error('Failed to load spaces:', error);
    }
  }, [getAuthHeaders]);

  const loadPasswords = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API}/passwords`, { headers });
      setPasswords(response.data);
    } catch (error) {
      console.error('Failed to load passwords:', error);
      toast.error('Failed to load passwords');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadSpaces();
    loadPasswords();
  }, [loadSpaces, loadPasswords]);

  // Read search parameter from URL on mount (for AI links)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
      // Clean up URL parameter after reading
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete('search');
      window.history.replaceState({}, '', newUrl);
    }
    
    // Handle highlight parameter for scrolling to specific password
    const highlightParam = urlParams.get('highlight');
    if (highlightParam) {
      // Scroll to highlighted password after a short delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.querySelector(`[data-password-id="${highlightParam}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a highlight effect
          element.classList.add('ring-2', 'ring-purple-500', 'ring-opacity-75');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-purple-500', 'ring-opacity-75');
          }, 2000);
        }
      }, 500);
    }
  }, []);

  // Use useMemo to create a stable selectedSpaceId
  const selectedSpaceId = useMemo(() => selectedSpace?.spaceId || null, [selectedSpace?.spaceId]);

  // Memoize filtered passwords to prevent infinite loops
  const filteredPasswords = useMemo(() => {
    let filtered = passwords;
    
    // Filter by selected space
    if (selectedSpaceId) {
      filtered = filtered.filter(p => p.spaceId === selectedSpaceId);
    }
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.displayName.toLowerCase().includes(query) ||
        (p.username && p.username.toLowerCase().includes(query)) ||
        (p.website && p.website.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [passwords, selectedSpaceId, selectedCategory, searchQuery]);

  const getSpaceIcon = (type) => {
    switch (type) {
      case 'family':
        return <Users className="w-4 h-4" />;
      case 'work':
        return <Building className="w-4 h-4" />;
      default:
        return <Home className="w-4 h-4" />;
    }
  };

  const handleAddPassword = async () => {
    if (!formData.displayName || !formData.password) {
      toast.error('Name and password are required');
      return;
    }

    try {
      const encryptedPassword = await encryptData(formData.password, encryptionKey);
      const encryptedNotes = formData.notes ? await encryptData(formData.notes, encryptionKey) : '';
      const passwordStrength = calculatePasswordStrength(formData.password);
      
      const headers = await getAuthHeaders();
      const payload = {
        displayName: formData.displayName,
        username: formData.username || '',
        website: formData.website || '',
        category: formData.category || 'Other',
        encryptedPassword: encryptedPassword,
        notes: encryptedNotes,
        strength: passwordStrength,
        spaceId: formData.spaceId || (selectedSpace?.spaceId || 'personal'),
        tags: [] // Add empty tags array if required
      };

      console.log('Creating password with payload:', { ...payload, encryptedPassword: '[REDACTED]' });
      
      const response = await axios.post(
        `${API}/passwords`,
        payload,
        { headers }
      );

      console.log('Password created successfully:', response.data);
      toast.success('Password added successfully');
      setIsAddDialogOpen(false);
      resetForm();
      loadPasswords();
    } catch (error) {
      console.error('Failed to add password - Full error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to add password';
      toast.error(`Password creation failed: ${errorMessage}`);
    }
  };

  const handleEditPassword = async (password) => {
    try {
      // Decrypt password and notes for editing
      const decryptedPassword = await decryptData(password.encryptedPassword, encryptionKey);
      const decryptedNotes = password.notes ? await decryptData(password.notes, encryptionKey) : '';
      
      setEditingPassword(password);
      setFormData({
        displayName: password.displayName || '',
        username: password.username || '',
        password: decryptedPassword,
        website: password.website || '',
        category: password.category || 'Other',
        notes: decryptedNotes,
        spaceId: password.spaceId || 'personal'
      });
      setIsEditDialogOpen(true);
    } catch (error) {
      console.error('Failed to decrypt password for editing:', error);
      toast.error('Failed to load password for editing');
    }
  };

  const handleUpdatePassword = async () => {
    if (!formData.displayName || !formData.password) {
      toast.error('Name and password are required');
      return;
    }

    if (!editingPassword) return;

    try {
      const encryptedPassword = await encryptData(formData.password, encryptionKey);
      const encryptedNotes = formData.notes ? await encryptData(formData.notes, encryptionKey) : '';
      const passwordStrength = calculatePasswordStrength(formData.password);
      
      const headers = await getAuthHeaders();
      const payload = {
        displayName: formData.displayName,
        username: formData.username || '',
        website: formData.website || '',
        category: formData.category || 'Other',
        encryptedPassword: encryptedPassword,
        notes: encryptedNotes,
        strength: passwordStrength,
        spaceId: formData.spaceId || (selectedSpace?.spaceId || 'personal'),
        tags: editingPassword.tags || []
      };

      const response = await axios.put(
        `${API}/passwords/${editingPassword.passwordId}`,
        payload,
        { headers }
      );

      toast.success('Password updated successfully');
      setIsEditDialogOpen(false);
      setEditingPassword(null);
      resetForm();
      loadPasswords();
    } catch (error) {
      console.error('Failed to update password - Full error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update password';
      toast.error(`Password update failed: ${errorMessage}`);
    }
  };

  const handleDeletePassword = async (passwordId) => {
    if (!window.confirm('Are you sure you want to delete this password?')) return;

    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API}/passwords/${passwordId}`, { headers });
      toast.success('Password deleted');
      loadPasswords();
    } catch (error) {
      console.error('Failed to delete password:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete password';
      toast.error(errorMessage);
    }
  };

  const handleCopyPassword = async (encryptedPassword) => {
    try {
      const decrypted = await decryptData(encryptedPassword, encryptionKey);
      await navigator.clipboard.writeText(decrypted);
      toast.success('Password copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy password');
    }
  };

  const toggleRevealPassword = (passwordId) => {
    setRevealedPasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(passwordId)) {
        newSet.delete(passwordId);
      } else {
        newSet.add(passwordId);
      }
      return newSet;
    });
  };

  const generateRandomPassword = () => {
    const password = generatePassword({ length: 16 });
    setFormData(prev => ({ ...prev, password }));
  };

  const resetForm = () => {
    setFormData({
      displayName: '',
      username: '',
      password: '',
      website: '',
      category: 'Other',
      notes: '',
      spaceId: selectedSpace?.spaceId || 'personal'
    });
    setEditingPassword(null);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden" data-testid="passwords-page">
        {/* Header */}
        <div className="glass rounded-2xl p-4 sm:p-6 shadow-lg w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
            <div className="flex-1 min-w-0 w-full sm:w-auto">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words">Passwords</h1>
              <p className="text-sm sm:text-base text-gray-600 break-words">
                {selectedSpace 
                  ? `${filteredPasswords.length} password${filteredPasswords.length !== 1 ? 's' : ''} in "${selectedSpace.name}"`
                  : `${passwords.length} password${passwords.length !== 1 ? 's' : ''} stored securely`}
              </p>
              
              {/* Space Details when space is selected */}
              {selectedSpace && (
                <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Space Type</p>
                    <p className="text-sm font-medium capitalize">{selectedSpace.type || 'personal'}</p>
                  </div>
                  {selectedSpace.createdAt && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Created</p>
                      <p className="text-sm font-medium">
                        {new Date(selectedSpace.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  )}
                  {selectedSpace.members && selectedSpace.members.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Members</p>
                      <p className="text-sm font-medium">
                        {selectedSpace.members.length + 1} member{selectedSpace.members.length !== 0 ? 's' : ''}
                        {currentUser?.userId !== selectedSpace.ownerId && ' (Shared)'}
                      </p>
                    </div>
                  )}
                  {currentUser?.userId !== selectedSpace.ownerId && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      <p className="text-sm font-medium text-blue-600">Shared with you</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-purple-600 to-purple-700 text-white w-full sm:w-auto flex-shrink-0"
                  data-testid="add-password-btn"
                >
                  <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">Add Password</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">Add New Password</DialogTitle>
                  <DialogDescription className="text-sm">
                    Create a new password entry. All sensitive data is encrypted before storage.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2 sm:py-4">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="e.g., Facebook, Gmail"
                      data-testid="password-name-input"
                    />
                  </div>
                  <div>
                    <Label>Username/Email</Label>
                    <Input
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="username@example.com"
                      data-testid="password-username-input"
                    />
                  </div>
                  <div>
                    <Label>Password *</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter password"
                        className="flex-1 min-w-0"
                        data-testid="password-password-input"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateRandomPassword}
                        className="flex-shrink-0"
                        data-testid="generate-password-btn"
                      >
                        <Key className="w-4 h-4" />
                      </Button>
                    </div>
                    {formData.password && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full strength-${calculatePasswordStrength(formData.password)} smooth-transition`}
                              style={{ width: `${(calculatePasswordStrength(formData.password) / 5) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 whitespace-nowrap flex-shrink-0">
                            {['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][calculatePasswordStrength(formData.password)]}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://example.com"
                      data-testid="password-website-input"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger data-testid="password-category-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes (encrypted)"
                      data-testid="password-notes-input"
                    />
                  </div>
                  <div>
                    <Label>Space</Label>
                    <Select 
                      value={formData.spaceId} 
                      onValueChange={(value) => setFormData({ ...formData, spaceId: value })}
                    >
                      <SelectTrigger data-testid="password-space-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {spaces.map(space => (
                          <SelectItem key={space.spaceId} value={space.spaceId}>
                            <div className="flex items-center gap-2">
                              {getSpaceIcon(space.type)}
                              <span>{space.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                        {spaces.length === 0 && (
                          <SelectItem value="personal">Personal</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleAddPassword} 
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700"
                    data-testid="save-password-btn"
                  >
                    Save Password
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Edit Password Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Edit Password</DialogTitle>
              <DialogDescription className="text-sm">
                Update password entry. All sensitive data is encrypted before storage.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 sm:py-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g., Facebook, Gmail"
                  data-testid="edit-password-name-input"
                />
              </div>
              <div>
                <Label>Username/Email</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="username@example.com"
                  data-testid="edit-password-username-input"
                />
              </div>
              <div>
                <Label>Password *</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password"
                    className="flex-1 min-w-0"
                    data-testid="edit-password-password-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateRandomPassword}
                    className="flex-shrink-0"
                    data-testid="edit-generate-password-btn"
                  >
                    <Key className="w-4 h-4" />
                  </Button>
                </div>
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full strength-${calculatePasswordStrength(formData.password)} smooth-transition`}
                          style={{ width: `${(calculatePasswordStrength(formData.password) / 5) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600 whitespace-nowrap flex-shrink-0">
                        {['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][calculatePasswordStrength(formData.password)]}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                  data-testid="edit-password-website-input"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger data-testid="edit-password-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes (encrypted)"
                  data-testid="edit-password-notes-input"
                />
              </div>
              <div>
                <Label>Space</Label>
                <Select 
                  value={formData.spaceId} 
                  onValueChange={(value) => setFormData({ ...formData, spaceId: value })}
                >
                  <SelectTrigger data-testid="edit-password-space-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {spaces.map(space => (
                      <SelectItem key={space.spaceId} value={space.spaceId}>
                        <div className="flex items-center gap-2">
                          {getSpaceIcon(space.type)}
                          <span>{space.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                    {spaces.length === 0 && (
                      <SelectItem value="personal">Personal</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    resetForm();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdatePassword} 
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700"
                  data-testid="update-password-btn"
                >
                  Update Password
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Space Switcher - Horizontal scrollable for mobile */}
        <div className="glass rounded-2xl p-3 sm:p-4 shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <motion.button
              onClick={() => setSelectedSpace(null)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg whitespace-nowrap smooth-transition flex-shrink-0 min-w-fit ${
                selectedSpace === null
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Key className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">All Spaces</span>
            </motion.button>
            {spaces.map((space) => (
              <motion.button
                key={space.spaceId}
                onClick={() => setSelectedSpace(space)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg whitespace-nowrap smooth-transition flex-shrink-0 min-w-fit ${
                  selectedSpace?.spaceId === space.spaceId
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className={`flex-shrink-0 ${selectedSpace?.spaceId === space.spaceId ? 'text-white' : 'text-gray-600'}`}>
                  {getSpaceIcon(space.type)}
                </div>
                <span className="font-medium text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">{space.name}</span>
                {selectedSpace?.spaceId === space.spaceId && (
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-3 sm:p-4 shadow-lg w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0 w-full sm:w-auto">
              <Input
                placeholder="Search passwords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-w-0"
                data-testid="passwords-search-input"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48 flex-shrink-0 min-w-0" data-testid="category-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Passwords Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {filteredPasswords.map((pwd, index) => (
            <PasswordCard
              key={pwd.passwordId}
              password={pwd}
              index={index}
              encryptionKey={encryptionKey}
              onDelete={handleDeletePassword}
              onEdit={handleEditPassword}
              onCopy={handleCopyPassword}
              isRevealed={revealedPasswords.has(pwd.passwordId)}
              onToggleReveal={toggleRevealPassword}
            />
          ))}
        </div>

        {filteredPasswords.length === 0 && (
          <div className="glass rounded-2xl p-6 sm:p-12 text-center">
            <Key className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg sm:text-xl font-bold mb-2">No passwords found</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              {searchQuery || selectedCategory !== 'All' 
                ? 'Try adjusting your filters' 
                : 'Add your first password to get started'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

function PasswordCard({ password, index, encryptionKey, onDelete, onEdit, onCopy, isRevealed, onToggleReveal, isShared }) {
  const [decryptedPassword, setDecryptedPassword] = useState('');

  useEffect(() => {
    if (isRevealed && !decryptedPassword) {
      decryptPassword();
    }
  }, [isRevealed]);

  const decryptPassword = async () => {
    try {
      const decrypted = await decryptData(password.encryptedPassword, encryptionKey);
      setDecryptedPassword(decrypted);
    } catch (error) {
      console.error('Failed to decrypt:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-2xl p-3 sm:p-4 shadow-lg hover:shadow-xl smooth-transition w-full max-w-full overflow-hidden"
      data-testid={`password-card-${index}`}
      data-password-id={password.passwordId}
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold text-base sm:text-lg text-gray-800 truncate">{password.displayName}</h3>
            {isShared && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1 flex-shrink-0">
                <Share2 className="w-3 h-3" />
                <span className="hidden sm:inline">Shared</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-600 truncate">{password.username || password.website || 'No username'}</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 flex-shrink-0">
          {password.category}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1 min-w-0 bg-gray-100 rounded-lg px-2 sm:px-3 py-2 font-mono text-xs sm:text-sm overflow-hidden truncate">
            {isRevealed ? (decryptedPassword || '••••••••') : '••••••••'}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onToggleReveal(password.passwordId)}
            className="flex-shrink-0 h-9 w-9"
            data-testid={`reveal-password-${index}`}
          >
            {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
        
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full strength-${password.strength} smooth-transition`}
            style={{ width: `${(password.strength / 5) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCopy(password.encryptedPassword)}
          className="flex-1 text-xs sm:text-sm"
          data-testid={`copy-password-${index}`}
        >
          <Copy className="w-3 h-3 sm:mr-1" />
          <span className="hidden sm:inline">Copy</span>
        </Button>
        {onEdit && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(password)}
            className="text-blue-600 hover:bg-blue-50 flex-shrink-0 h-8 w-8 sm:h-auto sm:w-auto sm:px-3"
            data-testid={`edit-password-${index}`}
          >
            <Edit className="w-3 h-3" />
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDelete(password.passwordId)}
          className="text-red-600 hover:bg-red-50 flex-shrink-0 h-8 w-8 sm:h-auto sm:w-auto sm:px-3"
          data-testid={`delete-password-${index}`}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </motion.div>
  );
}