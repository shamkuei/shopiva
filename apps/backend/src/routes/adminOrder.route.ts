import { Router } from 'express';
import * as ctrl from '../controllers/adminOrder.controller';

// Protected by `requireAuth` (/api/admin mount) + `requireOwner` (applied when
// this router is mounted in admin.route.ts). '/pending-count' before '/:id'.
const router = Router();
router.get('/', ctrl.list);
router.get('/pending-count', ctrl.pendingCount);
router.get('/:id', ctrl.detail);
router.put('/:id/status', ctrl.updateStatus);
export default router;
