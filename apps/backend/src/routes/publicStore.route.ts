import { Router } from 'express';
import { exists } from '../controllers/publicStore.controller';

// Public + tenant-agnostic (the gateway calls this with no tenant header).
const router = Router();
router.get('/', exists);
export default router;
