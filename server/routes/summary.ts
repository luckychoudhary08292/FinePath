import { Router, Response } from 'express';
import { DBStore } from '../db/store.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const summaryRouter = Router();

summaryRouter.use(requireAuth);

// GET /api/summary/overall?range=today|week|month|all
summaryRouter.get('/overall', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const range = (req.query.range as string) || 'today';

    const overall = await DBStore.getOverallSummary(userId, range);
    const enriched = {
      ...overall,
      netBalance: overall.netRemaining,
    };

    return res.json({
      success: true,
      data: enriched,
      overall: enriched,
    });
  } catch (error) {
    console.error('Error fetching overall summary:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch summary.' });
  }
});

// GET /api/summary/platform/:id?range=today|week|month|all
summaryRouter.get('/platform/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const range = (req.query.range as string) || 'today';

    const summary = await DBStore.getPlatformSummary(userId, id, range);
    const enriched = {
      ...summary,
      netBalance: summary.netRemaining,
    };

    return res.json({
      success: true,
      data: enriched,
      summary: enriched,
    });
  } catch (error) {
    console.error('Error fetching platform summary:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch platform summary.' });
  }
});
