import { Router } from 'express';
import { register, login, refresh, logout, me } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/authMiddleware';
import { authLimiter } from '../middlewares/rateLimit';

const router = Router();

// Credential-sensitive routes are rate-limited (brute-force protection).
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me); // protected

export default router;
