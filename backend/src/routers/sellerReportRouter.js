import { Router } from 'express';
import requireAuthentication from '../app/middleware/common/require-authentication.js';
import * as sellerReportController from '../app/controllers/sellerReportController.js';

const sellerReportRouter = Router();

sellerReportRouter.use(requireAuthentication);

sellerReportRouter.get('/revenue', sellerReportController.revenue);
sellerReportRouter.get('/top-products', sellerReportController.topProducts);
sellerReportRouter.get('/order-completion', sellerReportController.completion);

export default sellerReportRouter;
