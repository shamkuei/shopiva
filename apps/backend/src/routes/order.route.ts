import { Router } from 'express';
import { createOrder, pay } from '../controllers/order.controller';

// Public, tenant-scoped (mounted under /api with the tenant middleware).
const router = Router();
router.post('/', createOrder);
router.post('/:id/pay', pay);
export default router;
