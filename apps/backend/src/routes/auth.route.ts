import { Router } from 'express';
import { register, login, refresh, logout, me } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me); // protected

export default router;
