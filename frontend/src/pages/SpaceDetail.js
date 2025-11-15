import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Plus, ArrowLeft, Key, IndianRupee, Users, Home, Building } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import useBillStore from '../stores/billStore';
import BillCard from '../components/bills/BillCard';
import BillForm from '../components/bills/BillForm';
import BillDetails from '../components/bills/BillDetails';
import BalanceSummary from '../components/bills/BalanceSummary';
import SettlementHistory from '../components/bills/SettlementHistory';
import { encryptData, decryptData } from '../utils/encryption';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

export default function SpaceDetail() {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders, encryptionKey, currentUser, loading: authLoading } = useAuth();
  
  const [space, setSpace] = useState(null);
  const [passwords, setPasswords] = useState([]);
  const [spaceMembers, setSpaceMembers] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('passwords'); // 'passwords' or 'bills'
  
  // Bill states
  const [isBillFormOpen, setIsBillFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [isBillDetailsOpen, setIsBillDetailsOpen] = useState(false);
  
  const {
    bills,
    balances,
    history,
    loadBills,
    createBill,
    updateBill,
    deleteBill,
    loadBalances,
    loadHistory,
    clear
  } = useBillStore();

  // Sync selectedBill with store when bills update
  useEffect(() => {
    if (selectedBill && bills.length > 0) {
      const updatedBill = bills.find(b => b.billId === selectedBill.billId);
      if (updatedBill) {
        setSelectedBill(updatedBill);
      }
    }
  }, [bills, selectedBill]);

  // Load space details
  const loadSpace = useCallback(async () => {
    if (!currentUser) {
      console.log('No current user, skipping loadSpace');
      return;
    }
    
    try {
      const headers = await getAuthHeaders();
      if (!headers || !headers.Authorization) {
        console.error('Failed to get auth headers');
        toast.error('Authentication error. Please try logging in again.');
        // Don't navigate away, just show error
        return;
      }
      const response = await axios.get(`${API}/spaces`, { headers });
      const foundSpace = response.data.find(s => s.spaceId === spaceId);
      if (!foundSpace) {
        toast.error('Space not found');
        // Only navigate if space truly doesn't exist, not on auth errors
        setTimeout(() => navigate('/spaces'), 2000);
        return;
      }
      setSpace(foundSpace);
    } catch (error) {
      console.error('Failed to load space:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication expired. Please refresh the page.');
        // Don't navigate on 401, let user refresh
      } else if (error.response?.status === 404) {
        toast.error('Space not found');
        setTimeout(() => navigate('/spaces'), 2000);
      } else {
        toast.error('Failed to load space. Please try again.');
        // Don't navigate on other errors, let user retry
      }
    }
  }, [spaceId, getAuthHeaders, navigate, currentUser]);

  // Load passwords for this space
  const loadPasswords = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const headers = await getAuthHeaders();
      if (!headers || !headers.Authorization) return;
      const response = await axios.get(`${API}/passwords?spaceId=${spaceId}`, { headers });
      setPasswords(response.data);
    } catch (error) {
      console.error('Failed to load passwords:', error);
      // Don't navigate on error, just log it
    }
  }, [spaceId, getAuthHeaders, currentUser]);

  // Load space members and user details
  const loadSpaceMembers = useCallback(async () => {
    if (!space || !currentUser) return;
    
    try {
      const headers = await getAuthHeaders();
      if (!headers || !headers.Authorization) return;
      
      const allMemberIds = [space.ownerId, ...(space.members || [])];
      const uniqueMemberIds = [...new Set(allMemberIds)];
      
      const memberPromises = uniqueMemberIds.map(async (memberId) => {
        try {
          const userResponse = await axios.get(`${API}/users/${memberId}`, { headers });
          return userResponse.data;
        } catch (error) {
          console.error(`Failed to fetch user ${memberId}:`, error);
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
      
      // Create users map
      const usersMap = {};
      members.forEach(member => {
        usersMap[member.userId] = member;
      });
      setUsers(usersMap);
    } catch (error) {
      console.error('Failed to load space members:', error);
      // Don't navigate on error
    }
  }, [space, getAuthHeaders, currentUser]);

  // Load bills
  const loadBillsData = useCallback(async () => {
    if (!spaceId || !currentUser) return;
    try {
      const headers = await getAuthHeaders();
      if (!headers || !headers.Authorization) return;
      
      await loadBills(spaceId, headers);
      await loadBalances(spaceId, headers);
      await loadHistory(spaceId, headers);
    } catch (error) {
      console.error('Failed to load bills:', error);
      // Don't navigate on error, just log it
    }
    // Note: loadBills, loadBalances, loadHistory are from Zustand store and should be stable
  }, [spaceId, currentUser, getAuthHeaders]);

  useEffect(() => {
    // Wait for auth to be ready before loading space
    if (!authLoading && currentUser) {
      const initialize = async () => {
        setLoading(true);
        await loadSpace();
        setLoading(false);
      };
      initialize();
    } else if (!authLoading && !currentUser) {
      // Auth is ready but no user - this shouldn't happen due to PrivateRoute, but handle it
      setLoading(false);
    }
  }, [authLoading, currentUser, loadSpace]);

  // Track last loaded spaceId to prevent infinite loops
  const lastLoadedSpaceIdRef = React.useRef(null);

  useEffect(() => {
    if (space && spaceId) {
      // Only load data if this is a different space than last time
      if (lastLoadedSpaceIdRef.current !== spaceId) {
        lastLoadedSpaceIdRef.current = spaceId;
        loadPasswords();
        loadSpaceMembers();
        loadBillsData();
      }
    } else if (!space) {
      // Reset when space is cleared
      lastLoadedSpaceIdRef.current = null;
    }
  }, [space, spaceId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  const handleCreateBill = async (billData) => {
    try {
      // Add spaceId to billData as required by backend
      const billDataWithSpaceId = {
        ...billData,
        spaceId: spaceId
      };
      await createBill(spaceId, billDataWithSpaceId);
      setIsBillFormOpen(false);
      toast.success('Bill created successfully');
    } catch (error) {
      console.error('Failed to create bill:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create bill';
      toast.error(errorMessage);
    }
  };

  const handleUpdateBill = async (billData) => {
    try {
      // Add spaceId to billData as required by backend
      const billDataWithSpaceId = {
        ...billData,
        spaceId: spaceId
      };
      await updateBill(spaceId, editingBill.billId, billDataWithSpaceId);
      setIsBillFormOpen(false);
      setEditingBill(null);
      toast.success('Bill updated successfully');
    } catch (error) {
      console.error('Failed to update bill:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update bill';
      toast.error(errorMessage);
    }
  };

  const handleDeleteBill = async (bill) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;
    
    try {
      await deleteBill(spaceId, bill.billId);
      toast.success('Bill deleted successfully');
    } catch (error) {
      console.error('Failed to delete bill:', error);
      toast.error('Failed to delete bill');
    }
  };

  const handleEditBill = (bill) => {
    setEditingBill(bill);
    setIsBillFormOpen(true);
  };

  const handleViewBillDetails = (bill) => {
    setSelectedBill(bill);
    setIsBillDetailsOpen(true);
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

  if (loading || !space) {
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
      <div className="space-y-6">
        {/* Header */}
        <div className="glass rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/spaces')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Spaces
            </Button>
          </div>
          <div className="flex items-center gap-4 mb-4">
            {getSpaceIcon(space.type)}
            <div>
              <h1 className="text-3xl font-bold">{space.name}</h1>
              <p className="text-gray-600 capitalize">{space.type} Space</p>
            </div>
          </div>
          
          {/* Space Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-gray-500 mb-1">Owner</p>
              <p className="text-sm font-medium">
                {users[space.ownerId]?.displayName || users[space.ownerId]?.email || space.ownerId}
                {currentUser?.userId === space.ownerId ? ' (Me)' : ''}
              </p>
            </div>
            {space.createdAt && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Created</p>
                <p className="text-sm font-medium">
                  {new Date(space.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500 mb-1">Members ({spaceMembers.length})</p>
              <div className="flex flex-wrap gap-2">
                {spaceMembers.slice(0, 5).map((member) => (
                  <span 
                    key={member.userId}
                    className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full"
                  >
                    {member.displayName || member.email || member.userId}
                    {currentUser?.userId === member.userId ? ' (Me)' : ''}
                  </span>
                ))}
                {spaceMembers.length > 5 && (
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    +{spaceMembers.length - 5} more
                  </span>
                )}
              </div>
            </div>
            {currentUser?.userId !== space.ownerId && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Shared With You</p>
                <p className="text-sm font-medium text-blue-600">Yes</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden">
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setActiveTab('passwords')}
              className={`flex-1 py-2 text-center font-medium transition-colors ${
                activeTab === 'passwords'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600'
              }`}
            >
              <Key className="w-4 h-4 inline mr-2" />
              Passwords
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className={`flex-1 py-2 text-center font-medium transition-colors ${
                activeTab === 'bills'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600'
              }`}
            >
              <IndianRupee className="w-4 h-4 inline mr-2" />
              Bills
            </button>
          </div>
        </div>

        {/* Content: Desktop side-by-side, Mobile tabs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Passwords Section */}
          <div className={`${activeTab === 'passwords' ? 'block' : 'hidden'} md:block`}>
            <div className="glass rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Key className="w-6 h-6 text-purple-600" />
                  Passwords
                </h2>
                <span className="text-sm text-muted-foreground">
                  {passwords.length} {passwords.length === 1 ? 'password' : 'passwords'}
                </span>
              </div>
              
              {passwords.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No passwords in this space
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {passwords.map((password) => (
                    <motion.div
                      key={password.passwordId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg border bg-card hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{password.displayName}</p>
                          {password.username && (
                            <p className="text-sm text-muted-foreground">{password.username}</p>
                          )}
                        </div>
                        {password.website && (
                          <a
                            href={password.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-600 hover:underline"
                          >
                            Visit
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bills Section */}
          <div className={`${activeTab === 'bills' ? 'block' : 'hidden'} md:block`}>
            <div className="space-y-6">
              {/* Bills List */}
              <div className="glass rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <IndianRupee className="w-6 h-6 text-purple-600" />
                    Bills
                  </h2>
                  <Button
                    onClick={() => {
                      setEditingBill(null);
                      setIsBillFormOpen(true);
                    }}
                    className="bg-gradient-to-r from-purple-600 to-purple-700"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Bill
                  </Button>
                </div>

                {bills.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No bills in this space
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {bills.map((bill) => (
                      <BillCard
                        key={bill.billId}
                        bill={bill}
                        onEdit={handleEditBill}
                        onDelete={handleDeleteBill}
                        onViewDetails={handleViewBillDetails}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Balance Summary */}
              <BalanceSummary balances={balances} users={users} currentUserId={currentUser?.userId} />

              {/* Settlement History */}
              <SettlementHistory 
                history={history} 
                bills={bills.reduce((acc, b) => ({ ...acc, [b.billId]: b }), {})}
                users={users}
                onBillClick={handleViewBillDetails}
                currentUserId={currentUser?.userId}
              />
            </div>
          </div>
        </div>

        {/* Bill Form Dialog */}
        <BillForm
          open={isBillFormOpen}
          onOpenChange={(open) => {
            setIsBillFormOpen(open);
            if (!open) setEditingBill(null);
          }}
          onSubmit={editingBill ? handleUpdateBill : handleCreateBill}
          spaceMembers={spaceMembers}
          bill={editingBill}
          users={users}
          currentUserId={currentUser?.userId}
        />

        {/* Bill Details Dialog */}
        <BillDetails
          bill={selectedBill}
          open={isBillDetailsOpen}
          onOpenChange={setIsBillDetailsOpen}
          spaceId={spaceId}
          users={users}
          currentUserId={currentUser?.userId}
        />
      </div>
    </Layout>
  );
}

