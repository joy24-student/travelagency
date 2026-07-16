// Currency utility for handling BDT (Bangladeshi Taka) formatting

export const formatBDTCurrency = (amount: number | string): string => {
  // Ensure amount is a number
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '৳0.00';
  }

  // Format as BDT with Bangladeshi Numeral System (optional)
  // Using standard formatting for now
  return new Intl.NumberFormat('bn-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
};

export const formatBDTCurrencyWithoutSymbol = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '0.00';
  }

  return new Intl.NumberFormat('bn-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
};

export const convertToBDT = (amount: number, exchangeRate: number = 1): number => {
  // For now, since we're already dealing with BDT, just return the amount
  // exchangeRate would be used if converting from another currency
  return amount * exchangeRate;
};