import { Router } from 'express';
import requireAuthentication from '../app/middleware/common/require-authentication.js';
import validate from '../app/middleware/common/validate.js';
import * as referralController from '../app/controllers/referralController.js';
import * as referralRequest from '../app/requests/referralRequest.js';

const referralRouter = Router();

referralRouter.use(requireAuthentication);

referralRouter.get('/me', referralController.getMyReferralSummary);
referralRouter.get('/rewards', referralController.listReferralRewards);
referralRouter.post(
  '/qualify',
  validate(referralRequest.markQualified),
  referralController.markReferralQualified
);
referralRouter.post(
  '/reward',
  validate(referralRequest.rewardReferral),
  referralController.rewardReferral
);

export default referralRouter;
