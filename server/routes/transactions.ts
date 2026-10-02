import { Router, Response } from 'express';
import { DBStore } from '../db/store.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const transactionsRouter = Router();

transactionsRouter.use(requireAuth);

// GET /api/transactions — list all transactions for the user
transactionsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const range = (req.query.date as string) || (req.query.range as string) || 'all';
    const platformId = req.query.platformId as string | undefined;

    const transactions = await DBStore.getTransactions(userId, platformId, range);

    const formatted = transactions.map((t: any) => ({
      id: t._id.toString(),
      platformAccountId: t.platformAccountId.toString(),
      type: t.type,
      amount: t.amount,
      note: t.note,
      tag: t.tag,
      date: t.date,
      incentiveStatus: t.incentiveStatus,
    }));

    return res.json({ success: true, transactions: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch transactions.' });
  }
});

// POST /api/transactions — add earning/withdrawal/incentive
transactionsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { platformAccountId, type, amount, note, tag, date, incentiveStatus } = req.body;

    if (!platformAccountId) {
      return res.status(400).json({ success: false, message: 'Platform ID is required.' });
    }
    if (!type || !['earning', 'withdrawal', 'incentive'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction type.' });
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0.' });
    }

    const created = await DBStore.createTransaction(userId, {
      platformAccountId,
      type,
      amount: numAmount,
      note: note || '',
      tag: tag || '',
      date: date || new Date(),
      incentiveStatus: type === 'incentive' ? incentiveStatus || 'pending' : undefined,
    });

    return res.status(201).json({
      success: true,
      transaction: {
        id: created._id.toString(),
        platformAccountId: created.platformAccountId.toString(),
        type: created.type,
        amount: created.amount,
        note: created.note,
        tag: created.tag,
        date: created.date,
        incentiveStatus: created.incentiveStatus,
      },
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return res.status(500).json({ success: false, message: 'Failed to create transaction.' });
  }
});

// PATCH /api/transactions/:id/status — toggle incentive status (pending / received)
transactionsRouter.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'received'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be pending or received.' });
    }

    const updated = await DBStore.updateIncentiveStatus(userId, id, status);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    return res.json({
      success: true,
      transaction: {
        id: updated._id.toString(),
        incentiveStatus: updated.incentiveStatus,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update transaction status.' });
  }
});

// DELETE /api/transactions/:id
transactionsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const deleted = await DBStore.deleteTransaction(userId, id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    return res.json({ success: true, message: 'Transaction deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete transaction.' });
  }
});
