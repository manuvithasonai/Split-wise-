import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User.js';

const refreshCookieName = 'splitwise_refresh';
const refreshCookieMaxAge = 7 * 24 * 60 * 60 * 1000;

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/v1/auth',
  maxAge: refreshCookieMaxAge,
});

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createSession = async (user, res) => {
  const accessToken = jwt.sign(
    { sub: user.id },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();
  res.cookie(refreshCookieName, refreshToken, getRefreshCookieOptions());

  return {
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      defaultCurrency: user.defaultCurrency,
    },
  };
};

const sendValidationError = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;

  res.status(400).json({
    success: false,
    message: 'Please check the submitted details.',
    data: null,
    error: {
      code: 'VALIDATION_ERROR',
      details: errors.array().map(({ path, msg }) => ({ field: path, message: msg })),
    },
  });
  return true;
};

export const register = async (req, res, next) => {
  if (sendValidationError(req, res)) return;

  try {
    const name = req.body.name.trim();
    const email = req.body.email.trim().toLowerCase();
    const existingUser = await User.exists({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
        data: null,
        error: { code: 'EMAIL_ALREADY_REGISTERED' },
      });
    }

    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await User.create({ name, email, passwordHash });
    const session = await createSession(user, res);

    return res.status(201).json({
      success: true,
      message: 'Your account has been created.',
      data: session,
      error: null,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
        data: null,
        error: { code: 'EMAIL_ALREADY_REGISTERED' },
      });
    }
    return next(error);
  }
};

export const login = async (req, res, next) => {
  if (sendValidationError(req, res)) return;

  try {
    const email = req.body.email.trim().toLowerCase();
    const user = await User.findOne({ email }).select('+passwordHash');
    const passwordMatches = user
      ? await bcrypt.compare(req.body.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Email or password is incorrect.',
        data: null,
        error: { code: 'INVALID_CREDENTIALS' },
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This account is not available. Please contact support.',
        data: null,
        error: { code: 'ACCOUNT_UNAVAILABLE' },
      });
    }

    const session = await createSession(user, res);
    return res.status(200).json({
      success: true,
      message: 'You are now logged in.',
      data: session,
      error: null,
    });
  } catch (error) {
    return next(error);
  }
};

export const refresh = async (req, res, next) => {
  const refreshToken = req.cookies[refreshCookieName];

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Please log in again.',
      data: null,
      error: { code: 'REFRESH_TOKEN_MISSING' },
    });
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    if (payload.type !== 'refresh') {
      throw new jwt.JsonWebTokenError('Invalid refresh token type');
    }

    const user = await User.findById(payload.sub).select('+refreshTokenHash');
    const matchesCurrentSession = user
      && user.status === 'active'
      && user.refreshTokenHash === hashToken(refreshToken);

    if (!matchesCurrentSession) {
      res.clearCookie(refreshCookieName, getRefreshCookieOptions());
      return res.status(401).json({
        success: false,
        message: 'Please log in again.',
        data: null,
        error: { code: 'INVALID_REFRESH_TOKEN' },
      });
    }

    const session = await createSession(user, res);
    return res.status(200).json({
      success: true,
      message: 'Session refreshed.',
      data: session,
      error: null,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      res.clearCookie(refreshCookieName, getRefreshCookieOptions());
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
        data: null,
        error: { code: 'INVALID_REFRESH_TOKEN' },
      });
    }
    return next(error);
  }
};

export const logout = async (req, res, next) => {
  const refreshToken = req.cookies[refreshCookieName];

  try {
    if (refreshToken) {
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      await User.findByIdAndUpdate(payload.sub, { $unset: { refreshTokenHash: 1 } });
    }

    res.clearCookie(refreshCookieName, getRefreshCookieOptions());
    return res.status(200).json({
      success: true,
      message: 'You are logged out.',
      data: null,
      error: null,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      res.clearCookie(refreshCookieName, getRefreshCookieOptions());
      return res.status(200).json({
        success: true,
        message: 'You are logged out.',
        data: null,
        error: null,
      });
    }
    return next(error);
  }
};

export const getCurrentUser = (req, res) => res.status(200).json({
  success: true,
  message: 'Your profile has been loaded.',
  data: {
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      defaultCurrency: req.user.defaultCurrency,
    },
  },
  error: null,
});
