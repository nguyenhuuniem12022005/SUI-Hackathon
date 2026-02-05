import { Router } from 'express';
import requireAuthentication from '../app/middleware/common/require-authentication.js';
import ensureCustomer from '../app/middleware/customerMiddleware.js';
import * as cartController from '../app/controllers/cartController.js';

const router = Router();

router.use(requireAuthentication, ensureCustomer);

router
    .route('/')
    .get(cartController.getCart)
    .post(cartController.addItem)
    .delete(cartController.clearCart);

router
    .route('/:productId')
    .patch(cartController.updateItem)
    .delete(cartController.removeItem);

export default router;
