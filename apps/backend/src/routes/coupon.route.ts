import { Router } from 'express';
import { validate } from '../controllers/coupon.controller';

// Public storefront coupon routes (read-only preview/validate).
const router = Router();
router.get('/:code', validate);
export default router;
