import { Router } from 'express';
import { requireOwner } from '../middlewares/authMiddleware';
import { uploadProductImage } from '../middlewares/upload';
import * as ctrl from '../controllers/adminProduct.controller';

// All /api/admin/products/* routes are protected by `requireAuth` (mounted on
// /api/admin in app.ts) and `requireStaff` (applied in admin.route.ts), so
// ADMIN/STAFF can view and edit products. Deletion is irreversible — it stays
// owner-only via the per-route `requireOwner` guard below.
// Order matters: '/image' is declared before '/:id'.
const router = Router();
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/image', uploadProductImage, ctrl.uploadImage);
router.get('/:id', ctrl.get);
router.put('/:id', ctrl.update);
router.delete('/:id', requireOwner, ctrl.remove);
export default router;
