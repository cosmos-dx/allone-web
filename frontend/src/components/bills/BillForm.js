import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { calculateEqualSplit, calculateRatioSplit, calculateSpecificSplit, validateSplit } from '../../utils/billSplitter';
import { formatCurrency } from '../../utils/currency';

const SPLIT_TYPES = [
  { value: 'equal', label: 'Equal Split' },
  { value: 'ratio', label: 'Ratio Split' },
  { value: 'specific_amount', label: 'Specific Amount' },
  { value: 'partial', label: 'Partial Split' },
];

export default function BillForm({ 
  open, 
  onOpenChange, 
  onSubmit, 
  spaceMembers = [], 
  bill = null,
  users = {},
  currentUserId = null
}) {
  const isEdit = !!bill;
  
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: '',
    location: '',
    splitType: 'equal',
    participants: []
  });

  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [participantAmounts, setParticipantAmounts] = useState({});
  const [participantRatios, setParticipantRatios] = useState({});

  // Initialize form with bill data if editing
  useEffect(() => {
    if (bill) {
      setFormData({
        title: bill.title || '',
        amount: bill.amount?.toString() || '',
        date: bill.date ? new Date(bill.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: bill.description || '',
        category: bill.category || '',
        location: bill.location || '',
        splitType: bill.splitType || 'equal',
        participants: bill.participants || []
      });

      // Set selected members
      const memberSet = new Set(bill.participants?.map(p => p.userId) || []);
      setSelectedMembers(memberSet);

      // Set participant amounts and ratios
      const amounts = {};
      const ratios = {};
      bill.participants?.forEach(p => {
        amounts[p.userId] = p.amount?.toString() || '';
        ratios[p.userId] = p.ratio?.toString() || '';
      });
      setParticipantAmounts(amounts);
      setParticipantRatios(ratios);
    } else {
      // Default: select all members
      const allMembers = new Set(spaceMembers.map(m => m.userId || m));
      setSelectedMembers(allMembers);
    }
  }, [bill, spaceMembers]);

  // Calculate split amounts when amount or split type changes
  useEffect(() => {
    if (!formData.amount || selectedMembers.size === 0) return;

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) return;

    const selectedArray = Array.from(selectedMembers);

    if (formData.splitType === 'equal') {
      const perPerson = calculateEqualSplit(amount, selectedArray.length);
      const amounts = {};
      selectedArray.forEach(userId => {
        amounts[userId] = perPerson.toFixed(2);
      });
      setParticipantAmounts(amounts);
    } else if (formData.splitType === 'ratio') {
      // Initialize ratios if not set
      const ratios = { ...participantRatios };
      selectedArray.forEach(userId => {
        if (!ratios[userId]) {
          ratios[userId] = '1';
        }
      });
      setParticipantRatios(ratios);
      
      // Calculate amounts from ratios
      const ratioData = selectedArray.map(userId => ({
        userId,
        ratio: parseFloat(ratios[userId] || '1')
      }));
      const calculated = calculateRatioSplit(amount, ratioData);
      const amounts = {};
      calculated.forEach(({ userId, amount: amt }) => {
        amounts[userId] = amt.toFixed(2);
      });
      setParticipantAmounts(amounts);
    } else if (formData.splitType === 'specific_amount') {
      // Keep existing amounts, but ensure all participants have an amount
      const amounts = { ...participantAmounts };
      selectedArray.forEach(userId => {
        if (!amounts[userId]) {
          amounts[userId] = '';
        }
      });
      setParticipantAmounts(amounts);
    }
  }, [formData.amount, formData.splitType, selectedMembers.size]);

  // Recalculate when ratios change
  useEffect(() => {
    if (formData.splitType === 'ratio' && formData.amount) {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) return;

      const selectedArray = Array.from(selectedMembers);
      const ratioData = selectedArray.map(userId => ({
        userId,
        ratio: parseFloat(participantRatios[userId] || '1')
      }));
      const calculated = calculateRatioSplit(amount, ratioData);
      const amounts = {};
      calculated.forEach(({ userId, amount: amt }) => {
        amounts[userId] = amt.toFixed(2);
      });
      setParticipantAmounts(amounts);
    }
  }, [participantRatios, formData.splitType, formData.amount, selectedMembers]);

  const getDisplayName = (userId) => {
    const name = users[userId]?.displayName || users[userId]?.email || userId;
    const isMe = currentUserId && userId === currentUserId;
    return isMe ? `${name} (Me)` : name;
  };

  const handleMemberToggle = (userId) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedMembers(newSelected);

    // Remove amounts/ratios for deselected members
    if (!newSelected.has(userId)) {
      const newAmounts = { ...participantAmounts };
      const newRatios = { ...participantRatios };
      delete newAmounts[userId];
      delete newRatios[userId];
      setParticipantAmounts(newAmounts);
      setParticipantRatios(newRatios);
    }
  };

  const handleAmountChange = (userId, value) => {
    setParticipantAmounts(prev => ({
      ...prev,
      [userId]: value
    }));
  };

  const handleRatioChange = (userId, value) => {
    setParticipantRatios(prev => ({
      ...prev,
      [userId]: value
    }));
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.title.trim()) {
      toast.error('Bill title is required');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valid bill amount is required');
      return;
    }

    if (selectedMembers.size === 0) {
      toast.error('At least one participant is required');
      return;
    }

    // Build participants array
    const participants = Array.from(selectedMembers).map(userId => {
      const participant = {
        userId,
        amount: parseFloat(participantAmounts[userId] || '0'),
        paid: false
      };

      if (formData.splitType === 'ratio') {
        participant.ratio = parseFloat(participantRatios[userId] || '1');
      }

      return participant;
    });

    // Validate split amounts
    const validation = validateSplit(amount, participants, formData.splitType);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    const billData = {
      title: formData.title.trim(),
      amount,
      date: formData.date,
      description: formData.description.trim() || undefined,
      category: formData.category.trim() || undefined,
      location: formData.location.trim() || undefined,
      splitType: formData.splitType,
      participants
    };

    onSubmit(billData);
  };

  const totalCalculated = useMemo(() => {
    return Object.values(participantAmounts).reduce((sum, val) => {
      return sum + (parseFloat(val) || 0);
    }, 0);
  }, [participantAmounts]);

  const billAmount = parseFloat(formData.amount) || 0;
  const difference = billAmount - totalCalculated;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Bill' : 'Create New Bill'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update bill details and participants' : 'Add a new bill and split it among participants'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Dinner at Restaurant"
              />
            </div>
            <div>
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Food, Travel"
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>

          <div>
            <Label>Location</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Restaurant name, address"
            />
          </div>

          {/* Split Type */}
          <div>
            <Label>Split Type *</Label>
            <Select
              value={formData.splitType}
              onValueChange={(value) => setFormData({ ...formData, splitType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPLIT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Participants */}
          <div>
            <Label>Participants *</Label>
            <div className="space-y-2 mt-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {spaceMembers.map((member) => {
                const userId = member.userId || member;
                const isSelected = selectedMembers.has(userId);
                const displayName = getDisplayName(userId);

                return (
                  <div key={userId} className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleMemberToggle(userId)}
                    />
                    <Label className="flex-1 cursor-pointer" onClick={() => handleMemberToggle(userId)}>
                      {displayName}
                    </Label>
                    {isSelected && (
                      <div className="flex items-center gap-2">
                        {formData.splitType === 'ratio' && (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              value={participantRatios[userId] || ''}
                              onChange={(e) => handleRatioChange(userId, e.target.value)}
                              className="w-16 h-8"
                              placeholder="1"
                            />
                            <span className="text-xs text-muted-foreground">:</span>
                          </div>
                        )}
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={participantAmounts[userId] || ''}
                          onChange={(e) => handleAmountChange(userId, e.target.value)}
                          className="w-24 h-8"
                          placeholder="0.00"
                          disabled={formData.splitType === 'equal'}
                        />
                        <span className="text-xs text-muted-foreground">₹</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Split Summary */}
          {formData.amount && selectedMembers.size > 0 && (
            <div className="p-3 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between text-sm">
                <span>Total Calculated:</span>
                <span className="font-semibold">₹{totalCalculated.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Bill Amount:</span>
                <span className="font-semibold">₹{billAmount.toFixed(2)}</span>
              </div>
              {formData.splitType !== 'partial' && Math.abs(difference) > 0.01 && (
                <div className="flex items-center justify-between text-sm text-red-600 mt-1">
                  <span>Difference:</span>
                  <span className="font-semibold">₹{difference.toFixed(2)}</span>
                </div>
              )}
              {formData.splitType === 'partial' && difference > 0 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                  <span>Unassigned:</span>
                  <span>{formatCurrency(difference)}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700"
            >
              {isEdit ? 'Update Bill' : 'Create Bill'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

