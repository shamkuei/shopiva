import { Router } from 'express';
import { uploadProductImage } from '../middlewares/upload';
import * as ctrl from '../controllers/adminProduct.controller';

// All /api/admin/products/* routes are protected by `requireAuth` (mounted on
// /api/admin in app.ts) and `requireOwner` (applied when this router is mounted
// in admin.route.ts). Order matters: '/image' is declared before '/:id'.
const router = Router();
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/image', uploadProductImage, ctrl.uploadImage);
router.get('/:id', ctrl.get);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
export default router;
