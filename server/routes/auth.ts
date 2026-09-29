import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DBStore } from '../db/store.js';
import { JWT_SECRET, JWT_REFRESH_SECRET, requireAuth, AuthRequest } from '../middleware/auth.js';

export const authRouter = Router();

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

// POST /api/auth/signup
authRouter.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, phone, password, language = 'en' } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Name, mobile number, and password are required.' });
    }

    const cleanName = name.toString().trim();
    if (cleanName.length < 2) {
      return res.status(400).json({ success: false, message: 'Please enter a valid full name.' });
    }

    const cleanPhone = phone.toString().trim().replace(/[^\d+]/g, '');
    if (cleanPhone.replace(/[^\d]/g, '').length < 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const existing = await DBStore.findUserByPhone(cleanPhone);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this mobile number already exists. Please log in.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await DBStore.createUser({
      name: cleanName,
      phone: cleanPhone,
      passwordHash,
      language: language === 'hi' ? 'hi' : 'en',
    });

    const userId = user._id.toString();
    const tokens = generateTokens(userId);

    return res.status(201).json({
      success: true,
      user: {
        id: userId,
        name: user.name,
        phone: user.phone,
        language: user.language,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create account. Please try again.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Mobile number and password are required.' });
    }

    const cleanPhone = phone.toString().trim().replace(/[^\d+]/g, '');
    const user = await DBStore.findUserByPhone(cleanPhone);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid mobile number or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid mobile number or password.' });
    }

    const userId = user._id.toString();
    const tokens = generateTokens(userId);

    return res.json({
      success: true,
      user: {
        id: userId,
        name: user.name,
        phone: user.phone,
        language: user.language,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
    const user = await DBStore.findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const tokens = generateTokens(user._id.toString());
    return res.json({ success: true, ...tokens });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  return res.json({
    success: true,
    user: {
      id: user._id.toString(),
      name: user.name,
      phone: user.phone,
      language: user.language,
    },
  });
});

// Handler for profile updates (supports both PATCH and PUT)
const handleProfileUpdate = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, language, dailyTarget } = req.body;

    const updates: Partial<{ name: string; language: 'en' | 'hi'; dailyTarget?: number }> = {};
    if (name) updates.name = name.trim();
    if (language && (language === 'en' || language === 'hi')) updates.language = language;
    if (typeof dailyTarget === 'number' && dailyTarget >= 0) updates.dailyTarget = dailyTarget;

    const updated = await DBStore.updateUser(userId, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      user: {
        id: updated._id.toString(),
        name: updated.name,
        phone: updated.phone,
        language: updated.language,
        dailyTarget: updated.dailyTarget,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
};

authRouter.patch('/profile', requireAuth, handleProfileUpdate);
authRouter.put('/profile', requireAuth, handleProfileUpdate);
