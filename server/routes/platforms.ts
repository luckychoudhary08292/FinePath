import { Router, Response } from 'express';
import { DBStore } from '../db/store.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const platformsRouter = Router();

// Apply auth to all platform routes
platformsRouter.use(requireAuth);

// GET /api/platforms — list user's platform accounts with today's summary attached
platformsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const range = (req.query.range as string) || 'today';
    const platforms = await DBStore.getPlatformsForUser(userId);

    // Attach summary for the selected range for each platform card
    const platformsWithSummary = await Promise.all(
      platforms.map(async (plt: any) => {
        const pId = plt._id.toString();
        const summary = await DBStore.getPlatformSummary(userId, pId, range);
        return {
          id: pId,
          platformName: plt.platformName,
          colorTheme: plt.colorTheme,
          icon: plt.icon,
          isActive: plt.isActive !== false,
          order: plt.order ?? 0,
          summary,
        };
      })
    );

    return res.json({ success: true, platforms: platformsWithSummary });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch platforms.' });
  }
});

// POST /api/platforms — add new platform
platformsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { platformName, colorTheme, icon } = req.body;

    if (!platformName || !platformName.trim()) {
      return res.status(400).json({ success: false, message: 'Platform name is required.' });
    }

    const created = await DBStore.createPlatform(userId, {
      platformName,
      colorTheme: colorTheme || '#002970',
      icon: icon || platformName.trim().charAt(0).toUpperCase(),
    });

    return res.status(201).json({
      success: true,
      platform: {
        id: created._id.toString(),
        platformName: created.platformName,
        colorTheme: created.colorTheme,
        icon: created.icon,
        isActive: created.isActive,
        order: created.order,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add platform.' });
  }
});

// PATCH /api/platforms/:id — enable/disable/reorder
platformsRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { isActive, order, platformName, colorTheme, icon } = req.body;

    const updates: any = {};
    if (typeof isActive === 'boolean') updates.isActive = isActive;
    if (typeof order === 'number') updates.order = order;
    if (platformName) updates.platformName = platformName.trim();
    if (colorTheme) updates.colorTheme = colorTheme;
    if (icon) updates.icon = icon;

    const updated = await DBStore.updatePlatform(userId, id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Platform not found.' });
    }

    return res.json({
      success: true,
      platform: {
        id: updated._id.toString(),
        platformName: updated.platformName,
        colorTheme: updated.colorTheme,
        icon: updated.icon,
        isActive: updated.isActive,
        order: updated.order,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update platform.' });
  }
});

// DELETE /api/platforms/:id
platformsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const deleted = await DBStore.deletePlatform(userId, id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Platform not found.' });
    }

    return res.json({ success: true, message: 'Platform deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete platform.' });
  }
});

// GET /api/platforms/:id/summary?range=today|week|month|all
platformsRouter.get('/:id/summary', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const range = (req.query.range as string) || 'today';

    const platforms = await DBStore.getPlatformsForUser(userId);
    const platform = platforms.find((p: any) => p._id.toString() === id);

    if (!platform) {
      return res.status(404).json({ success: false, message: 'Platform not found.' });
    }

    const summary = await DBStore.getPlatformSummary(userId, id, range);

    return res.json({
      success: true,
      platform: {
        id: platform._id.toString(),
        platformName: platform.platformName,
        colorTheme: platform.colorTheme,
        icon: platform.icon,
      },
      range,
      summary,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch platform summary.' });
  }
});

// GET /api/platforms/:id/transactions?range=today|week|month|all
platformsRouter.get('/:id/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const range = (req.query.range as string) || 'all';

    const transactions = await DBStore.getTransactions(userId, id, range);

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
    return res.status(500).json({ success: false, message: 'Failed to fetch platform transactions.' });
  }
});
