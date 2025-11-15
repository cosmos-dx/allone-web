import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { History, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

export default function SettlementHistory({ history = [], bills = {}, users = {}, onBillClick = null, currentUserId = null }) {
  // Filter to only show settlements for settled bills
  const settledHistory = useMemo(() => {
    if (!history || !bills) return [];
    return history.filter(settlement => {
      const bill = bills[settlement.billId];
      return bill && bill.isSettled === true;
    });
  }, [history, bills]);

  if (!settledHistory || settledHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-purple-600" />
            Settlement History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No settled bills yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const getDisplayName = (userId) => {
    const name = users[userId]?.displayName || users[userId]?.email || userId;
    const isMe = currentUserId && userId === currentUserId;
    return isMe ? `${name} (Me)` : name;
  };

  const getBillTitle = (billId) => {
    return bills[billId]?.title || bills[billId]?.name || `Bill ${billId.substring(0, 8)}`;
  };

  const getBillAmount = (billId) => {
    const bill = bills[billId];
    return bill?.amount || bill?.totalAmount || 0;
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const handleSettlementClick = (settlement) => {
    if (onBillClick && settlement.billId) {
      const bill = bills[settlement.billId];
      if (bill) {
        onBillClick(bill);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-purple-600" />
          Settlement History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {settledHistory.map((settlement) => {
            const bill = bills[settlement.billId];
            const isClickable = onBillClick && bill;
            
            return (
              <div
                key={settlement.settlementId || `${settlement.billId}-${settlement.userId}-${settlement.paidAt}`}
                onClick={() => isClickable && handleSettlementClick(settlement)}
                className={`flex items-start gap-3 p-3 rounded-lg border bg-card ${
                  isClickable ? 'cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all' : ''
                }`}
              >
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {getDisplayName(settlement.userId)} paid {formatCurrency(settlement.amount || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {getBillTitle(settlement.billId)} • {formatCurrency(getBillAmount(settlement.billId))}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {formatDate(settlement.paidAt)}
                    </span>
                  </div>
                  {settlement.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      {settlement.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

