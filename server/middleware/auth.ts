import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { DBStore } from '../db/store.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'riderwallet_jwt_super_secret_access_key_2026';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'riderwallet_jwt_super_secret_refresh_key_2026';

export interface AuthRequest extends Request {
  user?: any;
  userId?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await DBStore.findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token: User not found.' });
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}
