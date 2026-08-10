import { Router } from 'express';
import { requireOwner } from '../middlewares/authMiddleware';
import { getMyStore } from '../controllers/admin.controller';
import adminProductRoute from './adminProduct.route';
import adminOrderRoute from './adminOrder.route';

// /api/admin is protected by `requireAuth` at the mount site (see app.ts).
// Owner-only routes add `requireOwner` here.
const router = Router();
router.get('/store', requireOwner, getMyStore);
router.use('/products', requireOwner, adminProductRoute);
router.use('/orders', requireOwner, adminOrderRoute);
export default router;
