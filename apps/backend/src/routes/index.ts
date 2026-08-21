import { Router } from 'express';
import productRoute from './product.route';
import orderRoute from './order.route';
import couponRoute from './coupon.route';
import inboxRoute from './inbox.route';

// Public storefront routes (products + orders + coupons + inbox). No tenant resolution — single store.
const router = Router();
router.use('/products', productRoute);
router.use('/orders', orderRoute);
router.use('/coupons', couponRoute);
router.use('/', inboxRoute);

export default router;
