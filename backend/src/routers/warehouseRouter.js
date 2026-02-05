import { Router } from 'express';
import * as warehouseController from '../app/controllers/warehouseController.js';
import requireAuthentication from '../app/middleware/common/require-authentication.js';
import validate from '../app/middleware/common/validate.js';
import * as warehouseRequest from '../app/requests/warehouseRequest.js';
import checkWarehouseIdExists from '../app/middleware/warehouseMiddeware.js';

const warehouseRouter = Router();
warehouseRouter.use(requireAuthentication);

warehouseRouter.get(
    '/',
    warehouseController.getWarehouses
);

warehouseRouter.post(
    '/new-warehouse',
    validate(warehouseRequest.createWarehouse),
    warehouseController.createWarehouse
);

warehouseRouter.put(
    '/:id/update-warehouse',
    validate(warehouseRequest.updateWarehouse),
    warehouseController.updateWarehouse
);

warehouseRouter.delete(
    '/:id/delete-warehouse',
    checkWarehouseIdExists,
    warehouseController.deleteWarehouse
);

export default warehouseRouter;
