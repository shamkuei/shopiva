import { Router } from 'express';
import { listProducts, getProduct, createProduct, deleteProduct } from '../controllers/product.controller';

const router = Router();
router.get('/', listProducts);
router.post('/', createProduct);
router.get('/:id', getProduct);
router.delete('/:id', deleteProduct);
export default router;
