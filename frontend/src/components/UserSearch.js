import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, UserPlus, X, User } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

export default function UserSearch({ onSelectUser, excludeUserIds = [] }) {
  const { getAuthHeaders } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${API}/users/search`, {
          params: { query: searchQuery },
          headers
        });
        
        // Filter out excluded users
        const filtered = response.data.filter(
          user => !excludeUserIds.includes(user.userId)
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error('User search failed:', error);
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to search users';
        toast.error(`Search failed: ${errorMessage}`);
        console.error('User search error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, excludeUserIds, getAuthHeaders]);

  const handleSelectUser = (user) => {
    // Clear search immediately for better UX
    setSearchQuery('');
    setSearchResults([]);
    
    // Call the callback immediately (single-select mode)
    if (onSelectUser) {
      onSelectUser(user);
    }
    
    // For multi-select mode, keep track of selected users
    // But in Spaces page, we use single-select, so we don't need to track here
    // setSelectedUsers([...selectedUsers, user]);
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u.userId !== userId));
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
        <Input
          type="text"
          placeholder="Search by name or email (min 2 characters)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          onFocus={() => {
            // Keep results visible when focused if there are results
            if (searchResults.length > 0) {
              // Results already shown
            }
          }}
        />
      </div>

      {/* Loading State */}
      {loading && searchQuery.length >= 2 && (
        <div className="text-center text-sm text-gray-500 py-2">
          <div className="inline-flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></div>
            Searching...
          </div>
        </div>
      )}

      {/* No Results Message */}
      {!loading && searchQuery.length >= 2 && searchResults.length === 0 && (
        <div className="text-center text-sm text-gray-500 py-2">
          No users found. Try a different search term.
        </div>
      )}

      {/* Search Results Dropdown */}
      {searchResults.length > 0 && (
        <div className="border border-gray-200 rounded-lg bg-white shadow-lg max-h-64 overflow-y-auto z-50">
          {searchResults.map((user) => (
            <button
              key={user.userId}
              onClick={() => handleSelectUser(user)}
              className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
            >
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={user.photoURL} />
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">
                  {user.displayName || 'No name'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <UserPlus className="w-5 h-5 text-blue-600 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Selected Users (if multi-select mode) */}
      {selectedUsers.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-sm font-medium text-gray-700">Selected Users:</p>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((user) => (
              <div
                key={user.userId}
                className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm"
              >
                <Avatar className="w-5 h-5">
                  <AvatarImage src={user.photoURL} />
                  <AvatarFallback className="text-xs">
                    {user.displayName?.[0] || user.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">
                  {user.displayName || user.email}
                </span>
                <button
                  onClick={() => handleRemoveUser(user.userId)}
                  className="ml-1 hover:bg-blue-100 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

