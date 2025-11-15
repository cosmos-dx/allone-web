/**
 * Bill splitting utility functions
 */

/**
 * Calculate equal split - divide amount equally among participants
 * @param {number} amount - Total bill amount
 * @param {number} participantCount - Number of participants
 * @returns {number} - Amount per participant
 */
export function calculateEqualSplit(amount, participantCount) {
  if (participantCount <= 0) return 0;
  return Math.round((amount / participantCount) * 100) / 100;
}

/**
 * Calculate ratio-based split
 * @param {number} amount - Total bill amount
 * @param {Array<{userId: string, ratio: number}>} ratios - Array of participant ratios
 * @returns {Array<{userId: string, amount: number}>} - Array of participant amounts
 */
export function calculateRatioSplit(amount, ratios) {
  const totalRatio = ratios.reduce((sum, r) => sum + (r.ratio || 0), 0);
  if (totalRatio === 0) {
    // If no ratios provided, split equally
    const equalAmount = calculateEqualSplit(amount, ratios.length);
    return ratios.map(r => ({ userId: r.userId, amount: equalAmount }));
  }

  return ratios.map(r => {
    const participantAmount = Math.round((amount * (r.ratio || 0) / totalRatio) * 100) / 100;
    return { userId: r.userId, amount: participantAmount };
  });
}

/**
 * Calculate specific amount split - use provided amounts
 * @param {Array<{userId: string, amount: number}>} amounts - Array of specific amounts
 * @returns {Array<{userId: string, amount: number}>} - Same array with validated amounts
 */
export function calculateSpecificSplit(amounts) {
  return amounts.map(a => ({
    userId: a.userId,
    amount: Math.round((a.amount || 0) * 100) / 100
  }));
}

/**
 * Validate split amounts
 * @param {number} totalAmount - Total bill amount
 * @param {Array<{userId: string, amount: number}>} splitData - Participant amounts
 * @param {string} splitType - Type of split (equal, ratio, specific_amount, partial)
 * @returns {{valid: boolean, error?: string, total: number}} - Validation result
 */
export function validateSplit(totalAmount, splitData, splitType) {
  const participantTotal = splitData.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  if (splitType === 'partial') {
    // Partial splits allow unassigned amount
    if (participantTotal > totalAmount) {
      return {
        valid: false,
        error: 'Participant amounts cannot exceed bill total',
        total: participantTotal
      };
    }
  } else {
    // Other split types must match exactly (within 0.01 for floating point)
    const difference = Math.abs(participantTotal - totalAmount);
    if (difference > 0.01) {
      return {
        valid: false,
        error: `Participant amounts (₹${participantTotal.toFixed(2)}) must equal bill total (₹${totalAmount.toFixed(2)})`,
        total: participantTotal
      };
    }
  }

  return {
    valid: true,
    total: participantTotal
  };
}

/**
 * Calculate net balances from bills
 * @param {Array} bills - Array of bill objects
 * @returns {Object} - Balance summary with debts and credits per user
 */
export function calculateBalances(bills) {
  const userBalances = {};

  bills.forEach(bill => {
    if (bill.isSettled) return; // Skip settled bills

    const participants = bill.participants || [];
    const createdBy = bill.createdBy;
    const totalAmount = bill.amount || 0;

    // Creator paid the bill, so they are owed money
    if (!userBalances[createdBy]) {
      userBalances[createdBy] = { debts: 0, credits: 0 };
    }
    userBalances[createdBy].credits += totalAmount;

    // Participants owe their share
    participants.forEach(participant => {
      const userId = participant.userId;
      const amount = participant.amount || 0;

      if (userId === createdBy) {
        // Creator's share reduces their credit
        userBalances[userId].credits -= amount;
      } else {
        if (!userBalances[userId]) {
          userBalances[userId] = { debts: 0, credits: 0 };
        }
        userBalances[userId].debts += amount;
      }
    });
  });

  // Calculate net balances
  const balances = [];
  Object.keys(userBalances).forEach(userId => {
    const balance = userBalances[userId];
    const net = balance.credits - balance.debts;
    if (Math.abs(net) > 0.01) {
      balances.push({
        userId,
        netBalance: Math.round(net * 100) / 100,
        debts: Math.round(balance.debts * 100) / 100,
        credits: Math.round(balance.credits * 100) / 100
      });
    }
  });

  return balances;
}

