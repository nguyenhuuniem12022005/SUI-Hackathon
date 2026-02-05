import { Router } from 'express';
import * as supplierController from '../app/controllers/supplierController.js';
import requireAuthentication from '../app/middleware/common/require-authentication.js';
import validate from '../app/middleware/common/validate.js';
import ensureSupplier from '../app/middleware/supplierMiddleware.js';
import * as supplierRequest from '../app/requests/supplierRequest.js';

const supplierRouter = Router();
supplierRouter.use(requireAuthentication);
supplierRouter.use(ensureSupplier);

supplierRouter.patch(
    '/me/update-shop-name',
    validate(supplierRequest.updateShopName),
    supplierController.updateShopName
);

supplierRouter.patch(
    '/me/update-seller-rating',
    supplierController.updateSellerRating
);

export default supplierRouter;
