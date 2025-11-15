import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ArrowRight, IndianRupee } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

export default function BalanceSummary({ balances, users = {}, currentUserId = null }) {
  if (!balances || balances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-purple-600" />
            Balance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No outstanding balances
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

  // Group balances: positive (owed to) and negative (owes)
  const creditors = balances.filter(b => b.netBalance > 0);
  const debtors = balances.filter(b => b.netBalance < 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IndianRupee className="h-5 w-5 text-purple-600" />
          Balance Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {creditors.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-green-600 mb-2">Owed To</h4>
            <div className="space-y-2">
              {creditors.map((balance) => (
                <div
                  key={balance.userId}
                  className="flex items-center justify-between p-2 rounded-lg bg-green-50"
                >
                  <span className="text-sm">{getDisplayName(balance.userId)}</span>
                  <span className="text-sm font-semibold text-green-600">
                    +{formatCurrency(Math.abs(balance.netBalance))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {debtors.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-red-600 mb-2">Owes</h4>
            <div className="space-y-2">
              {debtors.map((balance) => (
                <div
                  key={balance.userId}
                  className="flex items-center justify-between p-2 rounded-lg bg-red-50"
                >
                  <span className="text-sm">{getDisplayName(balance.userId)}</span>
                  <span className="text-sm font-semibold text-red-600">
                    -{formatCurrency(Math.abs(balance.netBalance))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show who owes whom */}
        {creditors.length > 0 && debtors.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-2">Settlements Needed</h4>
            <div className="space-y-2 text-sm">
              {debtors.map((debtor) => {
                const amountOwed = Math.abs(debtor.netBalance);
                // Find who should receive this payment (simplified - first creditor)
                const creditor = creditors[0];
                if (!creditor) return null;

                return (
                  <div
                    key={debtor.userId}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <span>{getDisplayName(debtor.userId)}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span>{getDisplayName(creditor.userId)}</span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(amountOwed)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

