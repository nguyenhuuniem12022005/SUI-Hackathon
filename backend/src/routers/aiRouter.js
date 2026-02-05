import express from 'express';
import * as aiController from '../app/controllers/aiController.js';

const router = express.Router();

router.post('/chat', aiController.chatWithAI);

export default router;
