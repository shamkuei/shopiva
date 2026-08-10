import { Router } from 'express';
import { callback } from '../controllers/payment.controller';

// Public, tenant-agnostic — Zarinpal redirects the browser here with no
// x-store-subdomain header, so this is mounted BEFORE the tenant middleware.
const router = Router();
router.get('/callback', callback);
export default router;
