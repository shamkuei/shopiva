import { Router } from 'express';
import { login, refresh, logout, me } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/authMiddleware';
import { authLimiter } from '../middlewares/rateLimit';

// Single store: no public registration — the owner is provisioned via the seed.
// Customers check out as guests (no account).
const router = Router();
router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me); // protected

export default router;
