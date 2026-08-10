import { Router } from 'express';
import storeRoute from './store.route';
import productRoute from './product.route';

// Tenant-scoped routes only. (Health is mounted tenant-agnostically in app.ts
// so infra probes don't depend on a store existing.)
const router = Router();
router.use('/stores', storeRoute);
router.use('/products', productRoute);

export default router;
