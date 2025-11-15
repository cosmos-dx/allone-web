import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiClient, { getApiUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LockScreen({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { getAuthHeaders } = useAuth();

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error('Please enter your passkey');
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await apiClient.post(
        getApiUrl('/api/auth/verify-password'),
        { password },
        { headers }
      );

      if (response.data.verified) {
        toast.success('Unlocked successfully');
        setPassword('');
        if (onUnlock) {
          onUnlock();
        }
      }
    } catch (error) {
      console.error('Failed to unlock:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Incorrect passkey';
      toast.error(errorMessage);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-gradient-to-br from-purple-900 via-purple-800 to-orange-900 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-orange-500 text-white flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">App Locked</h2>
          <p className="text-gray-400">Enter your passkey to unlock</p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter passkey"
              className="pr-10 text-center text-lg"
              autoFocus
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700"
            disabled={loading || !password}
          >
            {loading ? 'Unlocking...' : 'Unlock'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-4">
          App was locked due to inactivity
        </p>
      </motion.div>
    </motion.div>
  );
}

