import { Router } from 'express';
import { createOrder } from '../controllers/order.controller';

// Public, tenant-scoped (mounted under /api with the tenant middleware).
const router = Router();
router.post('/', createOrder);
export default router;
