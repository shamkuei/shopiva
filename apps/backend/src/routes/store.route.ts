import { Router } from 'express';
import { listStores, getCurrentStore } from '../controllers/store.controller';

const router = Router();
router.get('/', listStores);
router.get('/current', getCurrentStore);
export default router;
