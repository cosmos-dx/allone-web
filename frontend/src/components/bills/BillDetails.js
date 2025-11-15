import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { CheckCircle2, Circle, IndianRupee, Calendar, Users, MapPin, Tag } from 'lucide-react';
import { toast } from 'sonner';
import useBillStore from '../../stores/billStore';
import { formatCurrency } from '../../utils/currency';

export default function BillDetails({ bill, open, onOpenChange, spaceId, users = {}, currentUserId = null }) {
  const { settleBill, bills } = useBillStore();
  const [settlingUserId, setSettlingUserId] = useState(null);
  const [currentBill, setCurrentBill] = useState(bill);

  // Sync with store bills when bill prop or store bills change
  useEffect(() => {
    if (bill) {
      // First use the prop
      setCurrentBill(bill);
      
      // Then try to find updated version in store
      const updatedBill = bills.find(b => b.billId === bill.billId);
      if (updatedBill) {
        setCurrentBill(updatedBill);
      }
    }
  }, [bill, bills]);

  if (!currentBill) return null;

  const getDisplayName = (userId) => {
    const name = users[userId]?.displayName || users[userId]?.email || userId;
    const isMe = currentUserId && userId === currentUserId;
    return isMe ? `${name} (Me)` : name;
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const handleSettle = async (participant) => {
    if (participant.paid) {
      toast.info('This participant has already paid');
      return;
    }

    setSettlingUserId(participant.userId);
    try {
      // Get auth headers from Firebase
      const { auth } = await import('../../config/firebase');
      let headers = {};
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers = { Authorization: `Bearer ${token}` };
      }
      
      await settleBill(spaceId, currentBill.billId, {
        userId: participant.userId,
        amount: participant.amount,
        notes: ''
      }, headers);
      
      // Update local bill state with the updated bill from store
      const updatedBill = bills.find(b => b.billId === currentBill.billId);
      if (updatedBill) {
        setCurrentBill(updatedBill);
      }
      
      toast.success('Payment recorded successfully');
    } catch (error) {
      console.error('Failed to settle:', error);
      toast.error('Failed to record payment');
    } finally {
      setSettlingUserId(null);
    }
  };

  const paidCount = currentBill.participants?.filter(p => p.paid).length || 0;
  const totalParticipants = currentBill.participants?.length || 0;
  const isSettled = currentBill.isSettled || paidCount === totalParticipants;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <IndianRupee className="h-6 w-6 text-purple-600" />
            {currentBill.title}
          </DialogTitle>
          <DialogDescription>
            Bill details and settlement tracking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Bill Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-xl font-bold text-purple-600">
                  {formatCurrency(currentBill.amount || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="text-sm font-medium">{formatDate(currentBill.date)}</p>
              </div>
            </div>
            {currentBill.category && (
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="text-sm font-medium">{currentBill.category}</p>
                </div>
              </div>
            )}
            {currentBill.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="text-sm font-medium">{currentBill.location}</p>
                </div>
              </div>
            )}
          </div>

          {currentBill.description && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{currentBill.description}</p>
            </div>
          )}

          {/* Split Type */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Split Type</p>
            <span className="inline-block px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm">
              {currentBill.splitType?.replace('_', ' ').toUpperCase() || 'EQUAL'}
            </span>
          </div>

          {/* Settlement Status */}
          <div className="p-4 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Settlement Status</p>
              {isSettled ? (
                <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Fully Settled
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {paidCount} of {totalParticipants} paid
                </span>
              )}
            </div>
          </div>

          {/* Participants */}
          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants ({totalParticipants})
            </p>
            <div className="space-y-2">
              {currentBill.participants?.map((participant, index) => {
                const isPaid = participant.paid;
                const displayName = getDisplayName(participant.userId);
                const isSettling = settlingUserId === participant.userId;

                return (
                  <div
                    key={participant.userId || index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isPaid ? 'bg-green-50 border-green-200' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {isPaid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{displayName}</p>
                        {participant.paidAt && (
                          <p className="text-xs text-muted-foreground">
                            Paid on {formatDate(participant.paidAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">
                        {formatCurrency(participant.amount || 0)}
                      </span>
                      {!isPaid && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSettle(participant)}
                          disabled={isSettling}
                        >
                          {isSettling ? 'Recording...' : 'Mark Paid'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

