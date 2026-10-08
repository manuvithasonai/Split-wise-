import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const requireAuth = async (req, res, next) => {
  const authorization = req.get('authorization');
  const accessToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;

  if (!accessToken) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required.',
      data: null,
      error: { code: 'AUTH_REQUIRED' },
    });
  }

  try {
    const payload = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.sub).select('name email role status defaultCurrency');

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'This account is not available.',
        data: null,
        error: { code: 'ACCOUNT_UNAVAILABLE' },
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
        data: null,
        error: { code: 'INVALID_ACCESS_TOKEN' },
      });
    }

    return next(error);
  }
};
