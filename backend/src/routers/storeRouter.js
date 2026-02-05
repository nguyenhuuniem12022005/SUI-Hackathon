import { Router } from 'express';
import * as storeController from '../app/controllers/storeController.js';
import requireAuthentication from '../app/middleware/common/require-authentication.js';
import validate from '../app/middleware/common/validate.js';
import checkProductAndWarehouseExist from '../app/middleware/storeMiddleware.js';
import * as storeRequest from '../app/requests/storeRequest.js';

const storeRouter = Router();
storeRouter.use(requireAuthentication);

storeRouter.post(
    '/add-store',
    checkProductAndWarehouseExist,
    validate(storeRequest.createStore),
    storeController.createStore
);

storeRouter.patch(
    '/set-quantity',
    checkProductAndWarehouseExist,
    validate(storeRequest.setQuantity),
    storeController.setQuantity
);

storeRouter.patch(
    '/update-quantity',
    checkProductAndWarehouseExist,
    validate(storeRequest.updateQuantity),
    storeController.updateQuantity
);

storeRouter.delete(
    '/delete-store',
    checkProductAndWarehouseExist,
    validate(storeRequest.deleteStore),
    storeController.deleteStore
);

export default storeRouter;
