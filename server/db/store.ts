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
  dailyBreakdown?: DailyBreakdownItem[];
  weeklyBreakdown?: WeeklyBreakdownItem[];
  expenseBreakdown?: Array<{ tag: string; totalAmount: number; count: number }>;
  transactions?: any[];
}

// Persistent storage fallback when MONGODB_URI is not provided
interface MemUser {
  _id: string;
  name: string;
  phone: string;
  passwordHash: string;
  language: 'en' | 'hi';
  dailyTarget?: number;
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

  // 1. Specific calendar date (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(range)) {
    const [year, month, day] = range.split('-').map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day, 23, 59, 59, 999);
    return { start, end };
  }

  // 2. Today
  if (range === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end };
  }

  // 3. Yesterday
  if (range === 'yesterday') {
    const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const start = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0, 0);
    const end = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999);
    return { start, end };
  }

  // 4. Universal calendar week (Monday 00:00:00 to Sunday 23:59:59.999)
  // Supports 'week', 'this_week', or 'week:YYYY-MM-DD'
  if (range === 'week' || range === 'this_week' || range.startsWith('week:')) {
    let refDate = now;
    if (range.startsWith('week:')) {
      const datePart = range.replace('week:', '');
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        const [y, m, d] = datePart.split('-').map(Number);
        refDate = new Date(y, m - 1, d, 12, 0, 0);
      }
    }
    const day = refDate.getDay();
    // Monday is start of universal calendar week (if Sunday (0), diff is -6; else 1 - day)
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + diffToMonday, 0, 0, 0, 0);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
    return { start: monday, end: sunday };
  }

  // 5. Calendar month (1st of month 00:00:00 to last day of month 23:59:59.999)
  // Supports 'month', 'this_month', 'YYYY-MM', or 'month:YYYY-MM'
  if (range === 'month' || range === 'this_month' || /^\d{4}-\d{2}$/.test(range) || range.startsWith('month:')) {
    let year = now.getFullYear();
    let month = now.getMonth();
    const cleanRange = range.startsWith('month:') ? range.replace('month:', '') : range;
    if (/^\d{4}-\d{2}$/.test(cleanRange)) {
      const [y, m] = cleanRange.split('-').map(Number);
      year = y;
      month = m - 1;
    }
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  // 6. All time / all (no restrictions)
  if (range === 'all' || range === 'all_time') {
    return {};
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
    let savedUser: any;
    if (isMongoActive()) {
      const user = new UserModel({
        name: data.name,
        phone: data.phone,
        passwordHash: data.passwordHash,
        language: data.language || 'en',
      });
      const saved = await user.save();
      savedUser = saved.toObject();
    } else {
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
      savedUser = newUser;
    }

    const userId = savedUser._id.toString();
    // Initialize default platforms (Zomato, Swiggy, Blinkit, Rapido)
    for (const p of DEFAULT_PLATFORMS) {
      await this.createPlatform(userId, p);
    }

    return savedUser;
  },

  async updateUser(id: string, updates: Partial<{ name: string; language: 'en' | 'hi'; dailyTarget?: number }>) {
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
          const inBounds = tDate >= start && tDate <= end;
          const prefixMatch =
            typeof t.date === 'string' &&
            ((/^\d{4}-\d{2}-\d{2}$/.test(range) && t.date.startsWith(range)) ||
              (/^\d{4}-\d{2}$/.test(range) && t.date.startsWith(range)));
          if (!inBounds && !prefixMatch) return false;
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
        const inBounds = d >= start && d <= end;
        const prefixMatch =
          typeof t.date === 'string' &&
          ((/^\d{4}-\d{2}-\d{2}$/.test(range) && t.date.startsWith(range)) ||
            (/^\d{4}-\d{2}$/.test(range) && t.date.startsWith(range)));
        if (!inBounds && !prefixMatch) continue;
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

    // Fetch transactions in this range for deep calendar charts and transaction logs
    const allTx = await this.getTransactions(userId, undefined, range);

    let dailyBreakdown: DailyBreakdownItem[] | undefined;
    let weeklyBreakdown: WeeklyBreakdownItem[] | undefined;

    if (range === 'week' || range === 'this_week' || range.startsWith('week:')) {
      const { start: weekStart } = getDateFilter(range);
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      dailyBreakdown = [];
      if (weekStart) {
        for (let i = 0; i < 7; i++) {
          const d = new Date(weekStart);
          d.setDate(d.getDate() + i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${day}`;
          dailyBreakdown.push({
            date: dateStr,
            dayName: dayNames[i],
            totalEarned: 0,
            totalWithdrawn: 0,
            netRemaining: 0,
            tripCount: 0,
          });
        }

        // populate from allTx
        for (const tx of allTx) {
          const txDate = new Date(tx.date);
          const y = txDate.getFullYear();
          const m = String(txDate.getMonth() + 1).padStart(2, '0');
          const day = String(txDate.getDate()).padStart(2, '0');
          const txDateStr = `${y}-${m}-${day}`;
          const item = dailyBreakdown.find((d) => d.date === txDateStr || (typeof tx.date === 'string' && tx.date.startsWith(d.date)));
          if (item) {
            if (tx.type === 'earning') {
              item.totalEarned += tx.amount;
              item.tripCount = (item.tripCount || 0) + 1;
            } else if (tx.type === 'withdrawal') {
              item.totalWithdrawn += tx.amount;
            } else if (tx.type === 'incentive' && tx.incentiveStatus === 'received') {
              item.totalEarned += tx.amount;
            }
            item.netRemaining = item.totalEarned - item.totalWithdrawn;
          }
        }
      }
    } else if (range === 'month' || range === 'this_month' || /^\d{4}-\d{2}$/.test(range) || range.startsWith('month:')) {
      let year = new Date().getFullYear();
      let month = new Date().getMonth();
      const cleanRange = range.startsWith('month:') ? range.replace('month:', '') : range;
      if (/^\d{4}-\d{2}$/.test(cleanRange)) {
        const [y, m] = cleanRange.split('-').map(Number);
        year = y;
        month = m - 1;
      }
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const mStr = String(month + 1).padStart(2, '0');

      weeklyBreakdown = [
        { weekLabel: 'Week 1 (Days 1–7)', startDate: `${year}-${mStr}-01`, endDate: `${year}-${mStr}-07`, totalEarned: 0, totalWithdrawn: 0, netRemaining: 0 },
        { weekLabel: 'Week 2 (Days 8–14)', startDate: `${year}-${mStr}-08`, endDate: `${year}-${mStr}-14`, totalEarned: 0, totalWithdrawn: 0, netRemaining: 0 },
        { weekLabel: 'Week 3 (Days 15–21)', startDate: `${year}-${mStr}-15`, endDate: `${year}-${mStr}-21`, totalEarned: 0, totalWithdrawn: 0, netRemaining: 0 },
        { weekLabel: 'Week 4 (Days 22–28)', startDate: `${year}-${mStr}-22`, endDate: `${year}-${mStr}-28`, totalEarned: 0, totalWithdrawn: 0, netRemaining: 0 },
      ];
      if (daysInMonth > 28) {
        weeklyBreakdown.push({
          weekLabel: `Week 5 (Days 29–${daysInMonth})`,
          startDate: `${year}-${mStr}-29`,
          endDate: `${year}-${mStr}-${String(daysInMonth).padStart(2, '0')}`,
          totalEarned: 0,
          totalWithdrawn: 0,
          netRemaining: 0,
        });
      }

      for (const tx of allTx) {
        const txDate = new Date(tx.date);
        const dayOfMonth = txDate.getDate();
        let targetWeek: WeeklyBreakdownItem | undefined;
        if (dayOfMonth <= 7) targetWeek = weeklyBreakdown[0];
        else if (dayOfMonth <= 14) targetWeek = weeklyBreakdown[1];
        else if (dayOfMonth <= 21) targetWeek = weeklyBreakdown[2];
        else if (dayOfMonth <= 28) targetWeek = weeklyBreakdown[3];
        else if (weeklyBreakdown[4]) targetWeek = weeklyBreakdown[4];

        if (targetWeek) {
          if (tx.type === 'earning') {
            targetWeek.totalEarned += tx.amount;
          } else if (tx.type === 'withdrawal') {
            targetWeek.totalWithdrawn += tx.amount;
          } else if (tx.type === 'incentive' && tx.incentiveStatus === 'received') {
            targetWeek.totalEarned += tx.amount;
          }
          targetWeek.netRemaining = targetWeek.totalEarned - targetWeek.totalWithdrawn;
        }
      }
    } else if (range === 'all' || range === 'all_time') {
      const monthMap = new Map<string, { label: string; earned: number; withdrawn: number; net: number }>();
      for (const tx of allTx) {
        const d = new Date(tx.date);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const mLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (!monthMap.has(mKey)) {
          monthMap.set(mKey, { label: mLabel, earned: 0, withdrawn: 0, net: 0 });
        }
        const mItem = monthMap.get(mKey)!;
        if (tx.type === 'earning') mItem.earned += tx.amount;
        else if (tx.type === 'withdrawal') mItem.withdrawn += tx.amount;
        else if (tx.type === 'incentive' && tx.incentiveStatus === 'received') mItem.earned += tx.amount;
        mItem.net = mItem.earned - mItem.withdrawn;
      }
      weeklyBreakdown = Array.from(monthMap.entries()).map(([k, v]) => ({
        weekLabel: v.label,
        startDate: `${k}-01`,
        endDate: `${k}-31`,
        totalEarned: v.earned,
        totalWithdrawn: v.withdrawn,
        netRemaining: v.net,
      }));
    }

    // Compute expenses / withdrawals breakdown by tag (Fuel, Food, Maintenance, etc.)
    const expenseMap = new Map<string, { tag: string; totalAmount: number; count: number }>();
    for (const tx of allTx) {
      if (tx.type === 'withdrawal') {
        const tag = tx.tag?.trim() || 'Other Expense';
        if (!expenseMap.has(tag)) {
          expenseMap.set(tag, { tag, totalAmount: 0, count: 0 });
        }
        const item = expenseMap.get(tag)!;
        item.totalAmount += tx.amount;
        item.count += 1;
      }
    }
    const expenseBreakdown = Array.from(expenseMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);

    const formattedTx = allTx.map((t: any) => ({
      id: t._id ? t._id.toString() : t.id,
      platformAccountId: t.platformAccountId ? t.platformAccountId.toString() : '',
      type: t.type,
      amount: t.amount,
      note: t.note,
      tag: t.tag,
      date: t.date,
      incentiveStatus: t.incentiveStatus,
    }));

    return {
      range,
      totalEarned: grandEarned,
      totalWithdrawn: grandWithdrawn,
      incentivePending: grandIncentivePending,
      incentiveReceived: grandIncentiveReceived,
      netRemaining: grandEarned - grandWithdrawn,
      platformBreakdown: breakdown,
      dailyBreakdown,
      weeklyBreakdown,
      expenseBreakdown,
      transactions: formattedTx,
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
