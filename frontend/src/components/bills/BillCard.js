import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Edit, Trash2, CheckCircle2, Circle, IndianRupee, Calendar, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/currency';

export default function BillCard({ bill, onEdit, onDelete, onViewDetails }) {
  const paidCount = bill.participants?.filter(p => p.paid).length || 0;
  const totalParticipants = bill.participants?.length || 0;
  const isSettled = bill.isSettled || paidCount === totalParticipants;

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-purple-600" />
                {bill.title}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(bill.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {totalParticipants} {totalParticipants === 1 ? 'person' : 'people'}
                </span>
              </div>
            </div>
            {isSettled && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-purple-600">
                {formatCurrency(bill.amount || 0)}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                {bill.splitType?.replace('_', ' ').toUpperCase() || 'EQUAL'}
              </span>
            </div>

            {bill.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {bill.description}
              </p>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-sm">
                {isSettled ? (
                  <span className="text-green-600 font-medium">Settled</span>
                ) : (
                  <span className="text-muted-foreground">
                    {paidCount}/{totalParticipants} paid
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {onViewDetails && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(bill)}
                  >
                    View
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(bill)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(bill)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

