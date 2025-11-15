/**
 * Currency formatting utility
 */

/**
 * Format amount as Indian Rupee (₹)
 * @param {number} amount - Amount to format
 * @param {object} options - Formatting options
 * @param {boolean} options.showSymbol - Whether to show currency symbol (default: true)
 * @param {number} options.decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, options = {}) {
  const { showSymbol = true, decimals = 2 } = options;
  
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? '₹0.00' : '0.00';
  }
  
  const formatted = parseFloat(amount).toFixed(decimals);
  return showSymbol ? `₹${formatted}` : formatted;
}

/**
 * Format amount with Indian number formatting (commas for thousands)
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string with commas
 */
export function formatCurrencyWithCommas(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }
  
  const parts = parseFloat(amount).toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `₹${parts.join('.')}`;
}

