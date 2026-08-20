import { Router } from 'express';
import { createOrder, pay, track } from '../controllers/order.controller';

// Public storefront order routes (mounted under /api).
const router = Router();
router.post('/', createOrder);
router.post('/:id/pay', pay);
// Public tracking by order id — returns a safe subset only (no customer PII).
router.get('/track/:id', track);
export default router;
