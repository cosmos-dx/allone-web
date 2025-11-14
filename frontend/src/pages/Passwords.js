import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Plus, Eye, EyeOff, Copy, Edit, Trash2, Key, Search, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { encryptData, decryptData } from '../utils/encryption';
import { generatePassword, calculatePasswordStrength } from '../utils/passwordGenerator';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = ['Social', 'Banking', 'Work', 'Shopping', 'Email', 'Entertainment', 'Other'];

export default function Passwords() {
  const { getAuthHeaders, encryptionKey } = useAuth();
  const [passwords, setPasswords] = useState([]);
  const [filteredPasswords, setFilteredPasswords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState(new Set());
  
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    password: '',
    website: '',
    category: 'Other',
    notes: ''
  });

  useEffect(() => {
    loadPasswords();
  }, []);

  useEffect(() => {
    filterPasswords();
  }, [passwords, selectedCategory, searchQuery]);

  const loadPasswords = async () => {
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
  };

  const filterPasswords = () => {
    let filtered = passwords;
    
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
    
    setFilteredPasswords(filtered);
  };

  const handleAddPassword = async () => {
    if (!formData.displayName || !formData.password) {
      toast.error('Name and password are required');
      return;
    }

    try {
      const encryptedPassword = await encryptData(formData.password, encryptionKey);
      const encryptedNotes = formData.notes ? await encryptData(formData.notes, encryptionKey) : '';
      
      const headers = await getAuthHeaders();
      await axios.post(
        `${API}/passwords`,
        {
          ...formData,
          encryptedPassword,
          notes: encryptedNotes,
          strength: calculatePasswordStrength(formData.password)
        },
        { headers }
      );

      toast.success('Password added successfully');
      setIsAddDialogOpen(false);
      resetForm();
      loadPasswords();
    } catch (error) {
      console.error('Failed to add password:', error);
      toast.error('Failed to add password');
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
      toast.error('Failed to delete password');
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
      notes: ''
    });
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
      <div className="space-y-6" data-testid="passwords-page">
        {/* Header */}
        <div className="glass rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Passwords</h1>
              <p className="text-gray-600">{passwords.length} passwords stored securely</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-purple-600 to-purple-700 text-white"
                  data-testid="add-password-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Password
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Password</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
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
                        data-testid="password-password-input"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateRandomPassword}
                        data-testid="generate-password-btn"
                      >
                        <Key className="w-4 h-4" />
                      </Button>
                    </div>
                    {formData.password && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full strength-${calculatePasswordStrength(formData.password)} smooth-transition`}
                              style={{ width: `${(calculatePasswordStrength(formData.password) / 5) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">
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

        {/* Filters */}
        <div className="glass rounded-2xl p-4 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search passwords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
                data-testid="passwords-search-input"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48" data-testid="category-filter">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPasswords.map((pwd, index) => (
            <PasswordCard
              key={pwd.passwordId}
              password={pwd}
              index={index}
              encryptionKey={encryptionKey}
              onDelete={handleDeletePassword}
              onCopy={handleCopyPassword}
              isRevealed={revealedPasswords.has(pwd.passwordId)}
              onToggleReveal={toggleRevealPassword}
            />
          ))}
        </div>

        {filteredPasswords.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center">
            <Key className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold mb-2">No passwords found</h3>
            <p className="text-gray-600 mb-4">
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

function PasswordCard({ password, index, encryptionKey, onDelete, onCopy, isRevealed, onToggleReveal }) {
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
      className="glass rounded-2xl p-4 shadow-lg hover:shadow-xl smooth-transition"
      data-testid={`password-card-${index}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-800 mb-1">{password.displayName}</h3>
          <p className="text-sm text-gray-600">{password.username || password.website || 'No username'}</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
          {password.category}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-100 rounded-lg px-3 py-2 font-mono text-sm overflow-hidden">
            {isRevealed ? (decryptedPassword || '••••••••') : '••••••••'}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onToggleReveal(password.passwordId)}
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
          className="flex-1"
          data-testid={`copy-password-${index}`}
        >
          <Copy className="w-3 h-3 mr-1" />
          Copy
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDelete(password.passwordId)}
          className="text-red-600 hover:bg-red-50"
          data-testid={`delete-password-${index}`}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </motion.div>
  );
}