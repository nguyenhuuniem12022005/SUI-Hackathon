import { Router } from 'express';
import requireAuthentication from '../app/middleware/common/require-authentication.js';
import validate from '../app/middleware/common/validate.js';
import * as orderController from '../app/controllers/orderController.js';
import * as orderRequest from '../app/requests/orderRequest.js';

const orderRouter = Router();

orderRouter.use(requireAuthentication);

orderRouter.post('/', validate(orderRequest.createEscrowOrder), orderController.createEscrowOrder);
orderRouter.get('/me', orderController.listMyOrders);
orderRouter.get('/seller', orderController.listMySalesOrders);
orderRouter.get('/me/escrow', orderController.listMyEscrowEvents);
orderRouter.get('/:orderId', orderController.getOrder);
orderRouter.post('/:orderId/complete', orderController.markCompleted);
orderRouter.post('/:orderId/cancel', orderController.markCancelled);
orderRouter.post('/:orderId/confirm-buyer', orderController.confirmAsBuyer);
orderRouter.post('/:orderId/confirm-seller', orderController.confirmAsSeller);

export default orderRouter;
