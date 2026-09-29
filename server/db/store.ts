import { isMongoActive } from './connection.js';
import { UserModel, IUser } from '../models/User.js';
import { PlatformAccountModel, IPlatformAccount } from '../models/PlatformAccount.js';
import { TransactionModel, ITransaction, TransactionType, IncentiveStatus } from '../models/Transaction.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

export interface SummaryResult {
  totalEarned: number;
  totalWithdrawn: number;
  incentivePending: number;
  incentiveReceived: number;
  netRemaining: number;
}

export interface PlatformSummaryResult extends SummaryResult {
  platformId: string;
  platformName: string;
  colorTheme: string;
  icon: string;
  isActive: boolean;
}

export interface OverallSummaryResult extends SummaryResult {
  range: string;
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

// Persistent storage fallback when MONGODB_URI is not provided
interface MemUser {
  _id: string;
  name: string;
  phone: string;
  passwordHash: string;
  language: 'en' | 'hi';
  createdAt: string;
}

interface MemPlatform {
  _id: string;
  userId: string;
  platformName: string;
  colorTheme: string;
  icon: string;
  isActive: boolean;
  order: number;
  createdAt: string;
}

interface MemTransaction {
  _id: string;
  platformAccountId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  note: string;
  tag: string;
  date: string;
  incentiveStatus?: IncentiveStatus;
  createdAt: string;
}

const memUsers: MemUser[] = [];
const memPlatforms: MemPlatform[] = [];
const memTransactions: MemTransaction[] = [];

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'local_db.json');

function loadLocalData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.users)) memUsers.push(...parsed.users);
      if (Array.isArray(parsed.platforms)) memPlatforms.push(...parsed.platforms);
      if (Array.isArray(parsed.transactions)) memTransactions.push(...parsed.transactions);
      console.log(`[DBStore] Loaded ${memUsers.length} users and ${memTransactions.length} transactions from local store.`);
    }
  } catch (e) {
    console.warn('[DBStore] Error loading local file store:', e);
  }
}

function persistLocalData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        {
          users: memUsers,
          platforms: memPlatforms,
          transactions: memTransactions,
        },
        null,
        2
      ),
      'utf-8'
    );
  } catch (e) {
    console.warn('[DBStore] Error saving local file store:', e);
  }
}

// Load persisted data on server boot
loadLocalData();

// Helper to calculate date boundaries
export function getDateFilter(range: string): { start?: Date; end?: Date } {
  const now = new Date();
  if (range === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end };
  } else if (range === 'week') {
    // Start of current week (Monday)
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end };
  } else if (range === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  return {};
}

// Default Platforms to initialize for any new user
export const DEFAULT_PLATFORMS = [
  { platformName: 'Zomato', colorTheme: '#CB202D', icon: 'Z', order: 0 },
  { platformName: 'Swiggy', colorTheme: '#FC8019', icon: 'S', order: 1 },
  { platformName: 'Blinkit', colorTheme: '#F8CB46', icon: 'B', order: 2 },
  { platformName: 'Rapido', colorTheme: '#FFCC00', icon: 'R', order: 3 },
];

export const DBStore = {
  async findUserByPhone(phone: string) {
    if (isMongoActive()) {
      return await UserModel.findOne({ phone }).lean();
    }
    return memUsers.find((u) => u.phone === phone) || null;
  },

  async findUserById(id: string) {
    if (isMongoActive()) {
      return await UserModel.findById(id).lean();
    }
    return memUsers.find((u) => u._id === id) || null;
  },

  async createUser(data: { name: string; phone: string; passwordHash: string; language?: 'en' | 'hi' }) {
    if (isMongoActive()) {
      const user = new UserModel({
        name: data.name,
        phone: data.phone,
        passwordHash: data.passwordHash,
        language: data.language || 'en',
      });
      const saved = await user.save();
      return saved.toObject();
    }
    const newUser: MemUser = {
      _id: 'usr_' + Date.now() + Math.random().toString(36).substring(2, 6),
      name: data.name,
      phone: data.phone,
      passwordHash: data.passwordHash,
      language: data.language || 'en',
      createdAt: new Date().toISOString(),
    };
    memUsers.push(newUser);
    persistLocalData();
    return newUser;
  },

  async updateUser(id: string, updates: Partial<{ name: string; language: 'en' | 'hi' }>) {
    if (isMongoActive()) {
      return await UserModel.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    }
    const idx = memUsers.findIndex((u) => u._id === id);
    if (idx !== -1) {
      memUsers[idx] = { ...memUsers[idx], ...updates };
      persistLocalData();
      return memUsers[idx];
    }
    return null;
  },

  async initializeUserPlatforms(userId: string) {
    if (isMongoActive()) {
      const uObjectId = new mongoose.Types.ObjectId(userId);
      const existing = await PlatformAccountModel.find({ userId: uObjectId });
      if (existing.length === 0) {
        const platformsToInsert = DEFAULT_PLATFORMS.map((p) => ({
          userId: uObjectId,
          platformName: p.platformName,
          colorTheme: p.colorTheme,
          icon: p.icon,
          isActive: true,
          order: p.order,
        }));
        return await PlatformAccountModel.insertMany(platformsToInsert);
      }
      return existing;
    }

    const existing = memPlatforms.filter((p) => p.userId === userId);
    if (existing.length === 0) {
      const created: MemPlatform[] = DEFAULT_PLATFORMS.map((p, i) => ({
        _id: 'plt_' + Date.now() + '_' + i,
        userId,
        platformName: p.platformName,
        colorTheme: p.colorTheme,
        icon: p.icon,
        isActive: true,
        order: p.order,
        createdAt: new Date().toISOString(),
      }));
      memPlatforms.push(...created);
      persistLocalData();
      return created;
    }
    return existing;
  },

  async getPlatformsForUser(userId: string) {
    if (isMongoActive()) {
      return await PlatformAccountModel.find({ userId: new mongoose.Types.ObjectId(userId) })
        .sort({ order: 1, createdAt: 1 })
        .lean();
    }
    return memPlatforms
      .filter((p) => p.userId === userId)
      .sort((a, b) => a.order - b.order);
  },

  async createPlatform(
    userId: string,
    data: { platformName: string; colorTheme?: string; icon?: string; isActive?: boolean }
  ) {
    const existing = await this.getPlatformsForUser(userId);
    const order = existing.length;
    const initial = data.platformName.trim().charAt(0).toUpperCase() || 'P';

    if (isMongoActive()) {
      const plt = new PlatformAccountModel({
        userId: new mongoose.Types.ObjectId(userId),
        platformName: data.platformName.trim(),
        colorTheme: data.colorTheme || '#002970',
        icon: data.icon || initial,
        isActive: data.isActive !== false,
        order,
      });
      const saved = await plt.save();
      return saved.toObject();
    }

    const newPlt: MemPlatform = {
      _id: 'plt_' + Date.now() + Math.random().toString(36).substring(2, 6),
      userId,
      platformName: data.platformName.trim(),
      colorTheme: data.colorTheme || '#002970',
      icon: data.icon || initial,
      isActive: data.isActive !== false,
      order,
      createdAt: new Date().toISOString(),
    };
    memPlatforms.push(newPlt);
    persistLocalData();
    return newPlt;
  },

  async updatePlatform(
    userId: string,
    platformId: string,
    updates: Partial<{ platformName: string; colorTheme: string; icon: string; isActive: boolean; order: number }>
  ) {
    if (isMongoActive()) {
      return await PlatformAccountModel.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(platformId), userId: new mongoose.Types.ObjectId(userId) },
        { $set: updates },
        { new: true }
      ).lean();
    }
    const idx = memPlatforms.findIndex((p) => p._id === platformId && p.userId === userId);
    if (idx !== -1) {
      memPlatforms[idx] = { ...memPlatforms[idx], ...updates };
      persistLocalData();
      return memPlatforms[idx];
    }
    return null;
  },

  async deletePlatform(userId: string, platformId: string) {
    if (isMongoActive()) {
      await TransactionModel.deleteMany({
        platformAccountId: new mongoose.Types.ObjectId(platformId),
        userId: new mongoose.Types.ObjectId(userId),
      });
      return await PlatformAccountModel.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(platformId),
        userId: new mongoose.Types.ObjectId(userId),
      });
    }
    const pIdx = memPlatforms.findIndex((p) => p._id === platformId && p.userId === userId);
    if (pIdx !== -1) {
      const removed = memPlatforms.splice(pIdx, 1)[0];
      // remove associated transactions
      for (let i = memTransactions.length - 1; i >= 0; i--) {
        if (memTransactions[i].platformAccountId === platformId && memTransactions[i].userId === userId) {
          memTransactions.splice(i, 1);
        }
      }
      persistLocalData();
      return removed;
    }
    return null;
  },

  async createTransaction(
    userId: string,
    data: {
      platformAccountId: string;
      type: TransactionType;
      amount: number;
      note?: string;
      tag?: string;
      date?: Date | string;
      incentiveStatus?: IncentiveStatus;
    }
  ) {
    const txDate = data.date ? new Date(data.date) : new Date();
    const incentiveStatus: IncentiveStatus | undefined =
      data.type === 'incentive' ? data.incentiveStatus || 'pending' : undefined;

    if (isMongoActive()) {
      const tx = new TransactionModel({
        userId: new mongoose.Types.ObjectId(userId),
        platformAccountId: new mongoose.Types.ObjectId(data.platformAccountId),
        type: data.type,
        amount: Number(data.amount),
        note: data.note || '',
        tag: data.tag || '',
        date: txDate,
        incentiveStatus,
      });
      const saved = await tx.save();
      return saved.toObject();
    }

    const newTx: MemTransaction = {
      _id: 'tx_' + Date.now() + Math.random().toString(36).substring(2, 6),
      platformAccountId: data.platformAccountId,
      userId,
      type: data.type,
      amount: Number(data.amount),
      note: data.note || '',
      tag: data.tag || '',
      date: txDate.toISOString(),
      incentiveStatus,
      createdAt: new Date().toISOString(),
    };
    memTransactions.unshift(newTx);
    persistLocalData();
    return newTx;
  },

  async deleteTransaction(userId: string, transactionId: string) {
    if (isMongoActive()) {
      return await TransactionModel.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(transactionId),
        userId: new mongoose.Types.ObjectId(userId),
      });
    }
    const idx = memTransactions.findIndex((t) => t._id === transactionId && t.userId === userId);
    if (idx !== -1) {
      const removed = memTransactions.splice(idx, 1)[0];
      persistLocalData();
      return removed;
    }
    return null;
  },

  async updateIncentiveStatus(userId: string, transactionId: string, status: IncentiveStatus) {
    if (isMongoActive()) {
      return await TransactionModel.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(transactionId), userId: new mongoose.Types.ObjectId(userId) },
        { $set: { incentiveStatus: status } },
        { new: true }
      ).lean();
    }
    const idx = memTransactions.findIndex((t) => t._id === transactionId && t.userId === userId);
    if (idx !== -1) {
      memTransactions[idx].incentiveStatus = status;
      persistLocalData();
      return memTransactions[idx];
    }
    return null;
  },

  async getTransactions(userId: string, platformAccountId?: string, range: string = 'all') {
    const { start, end } = getDateFilter(range);

    if (isMongoActive()) {
      const query: Record<string, unknown> = { userId: new mongoose.Types.ObjectId(userId) };
      if (platformAccountId) {
        query.platformAccountId = new mongoose.Types.ObjectId(platformAccountId);
      }
      if (start && end) {
        query.date = { $gte: start, $lte: end };
      }
      return await TransactionModel.find(query).sort({ date: -1, createdAt: -1 }).lean();
    }

    return memTransactions
      .filter((t) => {
        if (t.userId !== userId) return false;
        if (platformAccountId && t.platformAccountId !== platformAccountId) return false;
        if (start && end) {
          const tDate = new Date(t.date);
          if (tDate < start || tDate > end) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  // Platform Summary using MongoDB Aggregation Pipeline or fallback calculation
  async getPlatformSummary(userId: string, platformAccountId: string, range: string = 'today') {
    const { start, end } = getDateFilter(range);

    if (isMongoActive()) {
      const matchStage: Record<string, unknown> = {
        userId: new mongoose.Types.ObjectId(userId),
        platformAccountId: new mongoose.Types.ObjectId(platformAccountId),
      };
      if (start && end) {
        matchStage.date = { $gte: start, $lte: end };
      }

      const aggregation = await TransactionModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalEarned: {
              $sum: { $cond: [{ $eq: ['$type', 'earning'] }, '$amount', 0] },
            },
            totalWithdrawn: {
              $sum: { $cond: [{ $eq: ['$type', 'withdrawal'] }, '$amount', 0] },
            },
            incentivePending: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$type', 'incentive'] },
                      { $eq: ['$incentiveStatus', 'pending'] },
                    ],
                  },
                  '$amount',
                  0,
                ],
              },
            },
            incentiveReceived: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$type', 'incentive'] },
                      { $eq: ['$incentiveStatus', 'received'] },
                    ],
                  },
                  '$amount',
                  0,
                ],
              },
            },
          },
        },
      ]);

      const totals = aggregation[0] || {
        totalEarned: 0,
        totalWithdrawn: 0,
        incentivePending: 0,
        incentiveReceived: 0,
      };

      const earned = totals.totalEarned + (totals.incentiveReceived || 0);
      const withdrawn = totals.totalWithdrawn || 0;
      const netRemaining = earned - withdrawn;

      return {
        totalEarned: earned,
        totalWithdrawn: withdrawn,
        incentivePending: totals.incentivePending || 0,
        incentiveReceived: totals.incentiveReceived || 0,
        netRemaining,
      };
    }

    // Fallback In-memory computation
    let totalEarned = 0;
    let totalWithdrawn = 0;
    let incentivePending = 0;
    let incentiveReceived = 0;

    for (const t of memTransactions) {
      if (t.userId !== userId || t.platformAccountId !== platformAccountId) continue;
      if (start && end) {
        const d = new Date(t.date);
        if (d < start || d > end) continue;
      }
      if (t.type === 'earning') {
        totalEarned += t.amount;
      } else if (t.type === 'withdrawal') {
        totalWithdrawn += t.amount;
      } else if (t.type === 'incentive') {
        if (t.incentiveStatus === 'received') {
          incentiveReceived += t.amount;
          totalEarned += t.amount;
        } else {
          incentivePending += t.amount;
        }
      }
    }

    return {
      totalEarned,
      totalWithdrawn,
      incentivePending,
      incentiveReceived,
      netRemaining: totalEarned - totalWithdrawn,
    };
  },

  // Overall combined summary across all platforms with per-platform breakdown
  async getOverallSummary(userId: string, range: string = 'today'): Promise<OverallSummaryResult> {
    const platforms = await this.getPlatformsForUser(userId);
    let grandEarned = 0;
    let grandWithdrawn = 0;
    let grandIncentivePending = 0;
    let grandIncentiveReceived = 0;

    const breakdown = [];

    for (const p of platforms) {
      const pId = p._id ? p._id.toString() : '';
      const summary = await this.getPlatformSummary(userId, pId, range);
      grandEarned += summary.totalEarned;
      grandWithdrawn += summary.totalWithdrawn;
      grandIncentivePending += summary.incentivePending;
      grandIncentiveReceived += summary.incentiveReceived;

      breakdown.push({
        platformId: pId,
        platformName: p.platformName,
        colorTheme: p.colorTheme,
        icon: p.icon,
        totalEarned: summary.totalEarned,
        totalWithdrawn: summary.totalWithdrawn,
        netRemaining: summary.netRemaining,
        percentage: 0,
      });
    }

    // calculate percentage of total earned
    for (const item of breakdown) {
      item.percentage = grandEarned > 0 ? Math.round((item.totalEarned / grandEarned) * 100) : 0;
    }

    return {
      range,
      totalEarned: grandEarned,
      totalWithdrawn: grandWithdrawn,
      incentivePending: grandIncentivePending,
      incentiveReceived: grandIncentiveReceived,
      netRemaining: grandEarned - grandWithdrawn,
      platformBreakdown: breakdown,
    };
  },

  // Seed realistic gig rider data (Zomato orders, petrol expenses, Swiggy earnings)
  async seedDemoData(userId: string) {
    const platforms = await this.getPlatformsForUser(userId);
    const zomato = platforms.find((p) => p.platformName.toLowerCase().includes('zomato')) || platforms[0];
    const swiggy = platforms.find((p) => p.platformName.toLowerCase().includes('swiggy')) || platforms[1];
    const blinkit = platforms.find((p) => p.platformName.toLowerCase().includes('blinkit')) || platforms[2];
    const rapido = platforms.find((p) => p.platformName.toLowerCase().includes('rapido')) || platforms[3];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 30);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const seedTxs = [
      {
        platformAccountId: zomato._id.toString(),
        type: 'earning' as TransactionType,
        amount: 320,
        note: 'Lunch Peak 4 Orders',
        tag: 'Order Payment',
        date: today,
      },
      {
        platformAccountId: swiggy._id.toString(),
        type: 'earning' as TransactionType,
        amount: 280,
        note: 'Morning shift 3 drops',
        tag: 'Order Payment',
        date: today,
      },
      {
        platformAccountId: blinkit._id.toString(),
        type: 'earning' as TransactionType,
        amount: 250,
        note: 'Dark store 5 quick deliveries',
        tag: 'Order Payment',
        date: today,
      },
      {
        platformAccountId: rapido._id.toString(),
        type: 'withdrawal' as TransactionType,
        amount: 200,
        note: 'Petrol pump refuel',
        tag: 'Fuel',
        date: today,
      },
      {
        platformAccountId: zomato._id.toString(),
        type: 'incentive' as TransactionType,
        amount: 450,
        note: 'Weekend target 25 orders',
        tag: 'Target Bonus',
        incentiveStatus: 'pending' as IncentiveStatus,
        date: today,
      },
      {
        platformAccountId: swiggy._id.toString(),
        type: 'earning' as TransactionType,
        amount: 540,
        note: 'Dinner peak surge',
        tag: 'Surge',
        date: yesterday,
      },
      {
        platformAccountId: zomato._id.toString(),
        type: 'withdrawal' as TransactionType,
        amount: 500,
        note: 'Sent to savings account',
        tag: 'Cash Withdrawal',
        date: yesterday,
      },
      {
        platformAccountId: blinkit._id.toString(),
        type: 'incentive' as TransactionType,
        amount: 200,
        note: 'Rain surge bonus',
        tag: 'Weather Bonus',
        incentiveStatus: 'received' as IncentiveStatus,
        date: threeDaysAgo,
      },
    ];

    for (const tx of seedTxs) {
      await this.createTransaction(userId, tx);
    }
  },
};
