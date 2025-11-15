import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, Smartphone, Users, TrendingUp, AlertCircle, IndianRupee } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { motion } from 'framer-motion';
import { billService } from '../services/billService';
import { formatCurrency } from '../utils/currency';
import PasskeyDialog from '../components/PasskeyDialog';
import useSecurityStore from '../stores/securityStore';
import usePasswordStore from '../stores/passwordStore';
import useTOTPStore from '../stores/totpStore';
import useSpaceStore from '../stores/spaceStore';
import { decryptData } from '../utils/encryption';
import { calculatePasswordStrength } from '../utils/passwordGenerator';

export default function Dashboard() {
  const { getAuthHeaders, currentUser, encryptionKey } = useAuth();
  const navigate = useNavigate();
  const { calculateSecurityStats } = useSecurityStore();
  
  // Use Zustand stores
  const { passwords, loadPasswords } = usePasswordStore();
  const { totps, loadTOTPs } = useTOTPStore();
  const { spaces, loadSpaces } = useSpaceStore();
  
  const [stats, setStats] = useState({
    totalPasswords: 0,
    weakPasswords: 0,
    totpCount: 0,
    securityScore: 0
  });
  const [billStats, setBillStats] = useState({
    totalBills: 0,
    pendingSettlements: 0,
    totalOwed: 0,
    totalOwing: 0
  });
  const [recentBills, setRecentBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPasskeyDialog, setShowPasskeyDialog] = useState(false);

  const loadBillsData = useCallback(async (spaces, headers) => {
    if (!spaces || spaces.length === 0) {
      setBillStats({
        totalBills: 0,
        pendingSettlements: 0,
        totalOwed: 0,
        totalOwing: 0
      });
      setRecentBills([]);
      return;
    }

    try {
      let allBills = [];
      let totalOwed = 0;
      let totalOwing = 0;
      let pendingCount = 0;

      // Load bills from all spaces in parallel (with caching from store)
      const billPromises = spaces.map(async (space) => {
        try {
          const bills = await billService.getBills(space.spaceId, headers);
          const balancesData = await billService.getBalances(space.spaceId, headers);
          return { bills, balancesData, spaceId: space.spaceId };
        } catch (billError) {
          console.error(`Failed to load bills for space ${space.spaceId}:`, billError);
          return { bills: [], balancesData: { balances: [] }, spaceId: space.spaceId };
        }
      });

      const results = await Promise.all(billPromises);

      // Process results
      results.forEach(({ bills, balancesData }) => {
        allBills = [...allBills, ...bills];
        
        const balances = Array.isArray(balancesData) ? balancesData : (balancesData.balances || []);
        balances.forEach(balance => {
          const netBalance = balance.netBalance || balance.amount || 0;
          if (netBalance > 0) {
            totalOwed += netBalance;
          } else if (netBalance < 0) {
            totalOwing += Math.abs(netBalance);
          }
        });
      });

      // Count pending settlements
      allBills.forEach(bill => {
        if (!bill.isSettled) {
          const paidCount = bill.participants?.filter(p => p.paid).length || 0;
          const totalParticipants = bill.participants?.length || 0;
          if (paidCount < totalParticipants) {
            pendingCount++;
          }
        }
      });

      // Sort bills by date (most recent first) and take top 5
      const sortedBills = allBills
        .sort((a, b) => {
          const dateA = new Date(a.date || a.createdAt || 0);
          const dateB = new Date(b.date || b.createdAt || 0);
          return dateB - dateA;
        })
        .slice(0, 5);

      setBillStats({
        totalBills: allBills.length,
        pendingSettlements: pendingCount,
        totalOwed: totalOwed,
        totalOwing: totalOwing
      });
      setRecentBills(sortedBills);
    } catch (error) {
      console.error('Failed to load bills data:', error);
      // Set empty stats on error to prevent infinite loops
      setBillStats({
        totalBills: 0,
        pendingSettlements: 0,
        totalOwed: 0,
        totalOwing: 0
      });
      setRecentBills([]);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      if (!headers || !headers.Authorization) {
        console.warn('No auth headers available');
        setLoading(false);
        return;
      }
      
      // Load data from stores (with caching) - these will use cache if available
      const [loadedPasswords, loadedTotps, loadedSpaces] = await Promise.all([
        loadPasswords(null, true, false).catch(err => {
          console.error('Failed to load passwords:', err);
          return [];
        }),
        loadTOTPs(null, true, false).catch(err => {
          console.error('Failed to load TOTPs:', err);
          return [];
        }),
        loadSpaces(false).catch(err => {
          console.error('Failed to load spaces:', err);
          return [];
        })
      ]);

      // Process passwords for security stats (use existing strength, don't decrypt unnecessarily)
      const processedPasswords = loadedPasswords?.map(pwd => ({
        ...pwd,
        password: '', // Don't store decrypted in state
        strength: pwd.strength || 0
      })) || [];

      // Calculate security stats using Zustand store
      const securityStats = calculateSecurityStats(processedPasswords);
      
      // Update local stats
      setStats({
        totalPasswords: securityStats.totalPasswords || loadedPasswords?.length || 0,
        weakPasswords: securityStats.weakPasswordCount || 0,
        totpCount: loadedTotps?.length || 0,
        securityScore: securityStats.securityScore || 0
      });

      // Load bills from all spaces (using store)
      await loadBillsData(loadedSpaces || [], headers);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Set empty stats on error
      setStats({
        totalPasswords: 0,
        weakPasswords: 0,
        totpCount: 0,
        securityScore: 0
      });
      setBillStats({
        totalBills: 0,
        pendingSettlements: 0,
        totalOwed: 0,
        totalOwing: 0
      });
      setRecentBills([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, getAuthHeaders, loadBillsData]);

  // Track if data has been loaded to prevent infinite loops
  const hasLoadedRef = React.useRef(false);

  useEffect(() => {
    // Check if passkey is enabled
    if (currentUser && !currentUser.passwordEnabled) {
      setShowPasskeyDialog(true);
    }
    // Only load data once when currentUser becomes available
    if (currentUser && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadDashboardData();
    } else if (!currentUser) {
      hasLoadedRef.current = false;
    }
  }, [currentUser, loadDashboardData]);

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

        {/* Bills Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-8 shadow-lg"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <IndianRupee className="w-6 h-6 text-purple-600" />
              Bills Overview
            </h2>
            <Button
              onClick={() => navigate('/spaces')}
              variant="outline"
              className="border-purple-600 text-purple-600 hover:bg-purple-50"
            >
              View All Bills
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Bills</p>
                  <p className="text-xl font-bold">{billStats.totalBills}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-xl font-bold">{billStats.pendingSettlements}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">You're Owed</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(billStats.totalOwed)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">You Owe</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(billStats.totalOwing)}</p>
                </div>
              </div>
            </Card>
          </div>

          {recentBills.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Recent Bills</h3>
              <div className="space-y-2">
                {recentBills.map((bill) => (
                  <div
                    key={bill.billId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => navigate(`/spaces/${bill.spaceId}`)}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{bill.title || bill.name || 'Untitled Bill'}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(bill.date || bill.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-600">{formatCurrency(bill.amount || bill.totalAmount || 0)}</p>
                      {bill.isSettled ? (
                        <p className="text-xs text-green-600">Settled</p>
                      ) : (
                        <p className="text-xs text-orange-600">Pending</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-8 shadow-lg"
        >
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              data-testid="quick-create-bill-btn"
            >
              <IndianRupee className="w-5 h-5 mr-2" />
              Create Bill
            </Button>
            <Button
              onClick={() => navigate('/spaces')}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white hover:scale-105 smooth-transition h-auto py-4"
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
      
      {/* Passkey Dialog */}
      <PasskeyDialog
        open={showPasskeyDialog}
        onOpenChange={setShowPasskeyDialog}
        required={false}
      />
    </Layout>
  );
}