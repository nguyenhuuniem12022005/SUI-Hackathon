import { Router } from 'express';
import * as overviewController from '../app/controllers/overviewController.js';

const overviewRouter = Router();

overviewRouter.get(
    '/data-overview',
    overviewController.getDataOverview
);

export default overviewRouter;
