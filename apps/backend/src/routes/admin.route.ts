import { Router } from 'express';
import { requireOwner } from '../middlewares/authMiddleware';
import { getMyStore, listMyProducts } from '../controllers/admin.controller';

// All /api/admin/* routes are protected by `requireAuth` at the mount site
// (see app.ts). Owner-only routes add `requireOwner` here.
const router = Router();
router.get('/store', requireOwner, getMyStore);
router.get('/products', requireOwner, listMyProducts);
export default router;
