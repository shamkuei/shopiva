import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { sendMessage, subscribe } from '../controllers/inbox.controller';

// Public inbox writes (contact form + newsletter). Unauthenticated, so a
// stricter limiter than the auth routes keeps junk out of the tables.
const inboxLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests, please try again later.' } },
});

const router = Router();
router.post('/contact', inboxLimiter, sendMessage);
router.post('/newsletter/subscribe', inboxLimiter, subscribe);
export default router;
