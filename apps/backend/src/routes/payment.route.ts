import { Router } from 'express';
import { callback } from '../controllers/payment.controller';

// Public — Zarinpal redirects the browser here (no auth header).
const router = Router();
router.get('/callback', callback);
export default router;
