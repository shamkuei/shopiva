import { Router } from 'express';
import { requireStaff } from '../middlewares/authMiddleware';
import adminProductRoute from './adminProduct.route';
import adminOrderRoute from './adminOrder.route';
import { stats } from '../controllers/adminStats.controller';

// /api/admin is protected by `requireAuth` at the mount site (see app.ts).
// Role policy:
//   - viewing/operating (stats, orders, product create/update) → any staff role
//   - deleting products (irreversible) → OWNER only (guard lives in
//     adminProduct.route.ts on the DELETE line)
const router = Router();
router.get('/stats', requireStaff, stats);
router.use('/products', requireStaff);
router.use('/products', adminProductRoute);
router.use('/orders', requireStaff, adminOrderRoute);
export default router;
