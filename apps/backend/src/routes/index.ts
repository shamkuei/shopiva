import { Router } from 'express';
import productRoute from './product.route';
import orderRoute from './order.route';

// Public storefront routes (products + orders). No tenant resolution — single store.
const router = Router();
router.use('/products', productRoute);
router.use('/orders', orderRoute);

export default router;
