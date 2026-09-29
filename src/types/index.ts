export type Language = 'en' | 'hi';

export type TransactionType = 'earning' | 'withdrawal' | 'incentive';
export type IncentiveStatus = 'pending' | 'received';
export type DateRange = 'today' | 'week' | 'month' | 'all';

export interface User {
  id: string;
  name: string;
  phone: string;
  language: Language;
  dailyTarget?: number;
}

export interface PlatformSummary {
  totalEarned: number;
  totalWithdrawn: number;
  incentivePending: number;
  incentiveReceived: number;
  netRemaining: number;
  netBalance?: number;
}

export interface PlatformAccount {
  id: string;
  platformName: string;
  colorTheme: string;
  icon: string;
  isActive: boolean;
  order: number;
  summary?: PlatformSummary;
}

export interface Transaction {
  id: string;
  platformAccountId: string;
  type: TransactionType;
  amount: number;
  note?: string;
  tag?: string;
  date: string;
  incentiveStatus?: IncentiveStatus;
}

export interface OverallSummary {
  range: string;
  totalEarned: number;
  totalWithdrawn: number;
  incentivePending: number;
  incentiveReceived: number;
  netRemaining: number;
  netBalance?: number;
  platformBreakdown: Array<{
    platformId: string;
    platformName: string;
    colorTheme: string;
    icon: string;
    totalEarned: number;
    totalWithdrawn: number;
    netRemaining: number;
    percentage: number;
  }>;
}
