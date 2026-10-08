import { Router } from 'express';
import { body } from 'express-validator';
import {
  getCurrentUser,
  login,
  logout,
  refresh,
  register,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post(
  '/register',
  [
    body('name').isString().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2 to 80 characters.'),
    body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('password').isString().isLength({ min: 8, max: 128 }).withMessage('Password must be 8 to 128 characters.'),
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('password').isString().notEmpty().withMessage('Password is required.'),
  ],
  login
);

router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, getCurrentUser);

export default router;
