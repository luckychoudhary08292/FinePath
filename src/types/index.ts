export type Language = 'en' | 'hi';

export type TransactionType = 'earning' | 'withdrawal' | 'incentive';
export type IncentiveStatus = 'pending' | 'received';
export type DateRange = 'today' | 'yesterday' | 'week' | 'month' | 'all' | string;

export interface DailyBreakdownItem {
  date: string;
  dayName: string;
  totalEarned: number;
  totalWithdrawn: number;
  netRemaining: number;
  tripCount?: number;
}

export interface WeeklyBreakdownItem {
  weekLabel: string;
  startDate: string;
  endDate: string;
  totalEarned: number;
  totalWithdrawn: number;
  netRemaining: number;
}

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

export interface ExpenseBreakdownItem {
  tag: string;
  totalAmount: number;
  count: number;
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
  dailyBreakdown?: DailyBreakdownItem[];
  weeklyBreakdown?: WeeklyBreakdownItem[];
  expenseBreakdown?: ExpenseBreakdownItem[];
  transactions?: Transaction[];
}
