import { Router } from 'express';
import { listProducts, getProduct } from '../controllers/product.controller';

// Public storefront product catalog (read-only). Management is under /api/admin.
const router = Router();
router.get('/', listProducts);
router.get('/:id', getProduct);
export default router;
