import { useState, useCallback, useEffect } from 'react';

export interface TransactionData {
  timestamp: number;
  chainId: number;
  method: 'incrementer' | 'direct';
  success: boolean;
  gasUsed?: bigint;
  blockNumber: bigint;
}

export function useAnalytics() {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);

  const addTransaction = useCallback((transaction: TransactionData) => {
    setTransactions(prev => [...prev, transaction]);
  }, []);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);

  // Keep only last 100 transactions to prevent memory issues
  useEffect(() => {
    if (transactions.length > 100) {
      setTransactions(prev => prev.slice(-100));
    }
  }, [transactions.length]);

  return {
    transactions,
    addTransaction,
    clearTransactions,
  };
}
