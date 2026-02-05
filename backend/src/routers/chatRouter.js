import { Router } from 'express';
import requireAuthentication from '../app/middleware/common/require-authentication.js';
import * as chatController from '../app/controllers/chatController.js';

const chatRouter = Router();

chatRouter.use(requireAuthentication);

chatRouter.post(
    '/by-product',
    chatController.getOrCreateChatRoom
);

chatRouter.get(
    '/',
    chatController.listChatRooms
);

chatRouter.get(
    '/:id/messages',
    chatController.fetchMessages
);

chatRouter.post(
    '/:id/messages',
    chatController.sendMessage
);

export default chatRouter;
