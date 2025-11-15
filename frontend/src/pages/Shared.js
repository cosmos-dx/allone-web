import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Share2, Home, Users, Building, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

export default function Shared() {
  const { getAuthHeaders, currentUser } = useAuth();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState({});

  useEffect(() => {
    loadSharedSpaces();
  }, []);

  const loadSharedSpaces = async () => {
    try {
      const headers = await getAuthHeaders();
      
      // Load all spaces - they include both owned and shared spaces
      const spacesRes = await axios.get(`${API}/spaces`, { headers });
      
      // Filter to only show spaces where user is a member but not the owner (shared spaces)
      const sharedSpaces = spacesRes.data.filter(space => 
        space.ownerId !== currentUser?.userId && 
        (space.members || []).includes(currentUser?.userId)
      );

      setSpaces(sharedSpaces);

      // Load user details for owners
      const ownerIds = [...new Set(sharedSpaces.map(s => s.ownerId))];
      const userPromises = ownerIds.map(async (userId) => {
        try {
          const userRes = await axios.get(`${API}/users/${userId}`, { headers });
          return userRes.data;
        } catch (error) {
          console.error(`Failed to fetch user ${userId}:`, error);
          return {
            userId,
            email: userId.includes('@') ? userId : 'Unknown Email',
            displayName: 'Unknown User',
            photoURL: ''
          };
        }
      });
      
      const userData = await Promise.all(userPromises);
      const usersMap = {};
      userData.forEach(user => {
        usersMap[user.userId] = user;
      });
      setUsers(usersMap);
    } catch (error) {
      console.error('Failed to load shared spaces:', error);
      toast.error('Failed to load shared spaces');
    } finally {
      setLoading(false);
    }
  };

  const getSpaceIcon = (type) => {
    switch (type) {
      case 'family':
        return <Users className="w-6 h-6" />;
      case 'work':
        return <Building className="w-6 h-6" />;
      default:
        return <Home className="w-6 h-6" />;
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
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
      <div className="space-y-6">
        {/* Header */}
        <div className="glass rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Share2 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Shared Spaces</h1>
          </div>
          <p className="text-gray-600">
            Spaces shared with you by other users
          </p>
        </div>

        {/* Shared Spaces Grid */}
        {spaces.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Share2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold mb-2">No shared spaces</h3>
            <p className="text-gray-600">Spaces shared with you will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map((space, index) => (
              <motion.div
                key={space.spaceId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/spaces/${space.spaceId}`)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-purple-600">
                          {getSpaceIcon(space.type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{space.name}</CardTitle>
                          <p className="text-sm text-gray-500 capitalize">{space.type} Space</p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Shared by</p>
                        <p className="text-sm font-medium">
                          {users[space.ownerId]?.displayName || users[space.ownerId]?.email || space.ownerId}
                        </p>
                      </div>
                      {space.createdAt && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Created</p>
                          <p className="text-sm font-medium">{formatDate(space.createdAt)}</p>
                        </div>
                      )}
                      {space.members && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Members</p>
                          <p className="text-sm font-medium">
                            {space.members.length + 1} member{space.members.length !== 0 ? 's' : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}


