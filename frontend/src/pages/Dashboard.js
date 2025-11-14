import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Shield, Key, Smartphone, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const { getAuthHeaders, currentUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPasswords: 0,
    weakPasswords: 0,
    totpCount: 0,
    securityScore: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const headers = await getAuthHeaders();
      
      const [passwordsRes, totpsRes, analysisRes] = await Promise.all([
        axios.get(`${API}/passwords`, { headers }),
        axios.get(`${API}/totp`, { headers }),
        axios.post(`${API}/ai/analyze-passwords`, {}, { headers })
      ]);

      const passwords = passwordsRes.data;
      const totps = totpsRes.data;
      const analysis = analysisRes.data;

      setStats({
        totalPasswords: passwords.length,
        weakPasswords: analysis.weakPasswords || 0,
        totpCount: totps.length,
        securityScore: analysis.securityScore || 0
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Passwords',
      value: stats.totalPasswords,
      icon: <Key className="w-8 h-8" />,
      color: 'from-purple-500 to-purple-600',
      action: () => navigate('/passwords')
    },
    {
      title: 'TOTP Codes',
      value: stats.totpCount,
      icon: <Smartphone className="w-8 h-8" />,
      color: 'from-orange-500 to-orange-600',
      action: () => navigate('/authenticator')
    },
    {
      title: 'Security Score',
      value: `${stats.securityScore}%`,
      icon: <Shield className="w-8 h-8" />,
      color: 'from-green-500 to-green-600',
      action: null
    },
    {
      title: 'Weak Passwords',
      value: stats.weakPasswords,
      icon: <AlertCircle className="w-8 h-8" />,
      color: 'from-red-500 to-red-600',
      action: () => navigate('/passwords')
    }
  ];

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
      <div className="space-y-8" data-testid="dashboard-page">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-8 shadow-lg"
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Welcome back, {currentUser?.displayName || 'User'}!
          </h1>
          <p className="text-gray-600">Here's your security overview</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={stat.action}
              className={`glass rounded-2xl p-6 shadow-lg hover:shadow-xl smooth-transition ${
                stat.action ? 'cursor-pointer hover:scale-105' : ''
              }`}
              data-testid={`stat-card-${index}`}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} text-white flex items-center justify-center mb-4`}>
                {stat.icon}
              </div>
              <h3 className="text-sm text-gray-600 mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-8 shadow-lg"
        >
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              onClick={() => navigate('/passwords')}
              className="bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:scale-105 smooth-transition h-auto py-4"
              data-testid="quick-add-password-btn"
            >
              <Key className="w-5 h-5 mr-2" />
              Add Password
            </Button>
            <Button
              onClick={() => navigate('/authenticator')}
              className="bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:scale-105 smooth-transition h-auto py-4"
              data-testid="quick-add-totp-btn"
            >
              <Smartphone className="w-5 h-5 mr-2" />
              Add TOTP
            </Button>
            <Button
              onClick={() => navigate('/spaces')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:scale-105 smooth-transition h-auto py-4"
              data-testid="quick-manage-spaces-btn"
            >
              <Users className="w-5 h-5 mr-2" />
              Manage Spaces
            </Button>
          </div>
        </motion.div>

        {/* Security Recommendations */}
        {stats.weakPasswords > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-2xl p-8 shadow-lg border-2 border-orange-200"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Security Alert</h3>
                <p className="text-gray-600 mb-4">
                  You have {stats.weakPasswords} weak password{stats.weakPasswords > 1 ? 's' : ''}. Consider updating them for better security.
                </p>
                <Button
                  onClick={() => navigate('/passwords')}
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  Review Passwords
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}