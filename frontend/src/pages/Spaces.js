import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Plus, Users, Building, Home } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Spaces() {
  const { getAuthHeaders } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'personal'
  });

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API}/spaces`, { headers });
      setSpaces(response.data);
    } catch (error) {
      console.error('Failed to load spaces:', error);
      toast.error('Failed to load spaces');
    } finally {
      setLoading(false);
    }
  };

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
      loadSpaces();
    } catch (error) {
      console.error('Failed to create space:', error);
      toast.error('Failed to create space');
    }
  };

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
            Family and work spaces can be shared with others (sharing feature coming soon!).
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
              className="glass rounded-2xl p-6 shadow-lg hover:shadow-xl smooth-transition cursor-pointer"
              data-testid={`space-card-${index}`}
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getSpaceColor(space.type)} text-white flex items-center justify-center mb-4`}>
                {getSpaceIcon(space.type)}
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">{space.name}</h3>
              <p className="text-sm text-gray-600 capitalize mb-4">{space.type} Space</p>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Owner</span>
                <span className="font-medium">You</span>
              </div>
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
      </div>
    </Layout>
  );
}