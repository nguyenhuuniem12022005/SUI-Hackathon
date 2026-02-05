import * as authController from '../app/controllers/authController.js';
import { Router } from 'express';
import * as authRequest from '../app/requests/authRequest.js';
import validate from '../app/middleware/common/validate.js';
import requireAuthentication from '../app/middleware/common/require-authentication.js';
import { checkValidEmail } from '../app/middleware/common/valid-params.js';

const authRouter = Router();

authRouter.post(
    '/register',
    validate(authRequest.register),
    authController.register
);

authRouter.post(
    '/login',
    validate(authRequest.login),
    authController.login
);

authRouter.post(
    '/logout',
    requireAuthentication,
    authController.logout
);

authRouter.patch(
    '/:email/reset-password',
    checkValidEmail,
    validate(authRequest.resetPassword),
    authController.resetPassword
);

authRouter.post(
    '/password-reset/request',
    validate(authRequest.requestPasswordReset),
    authController.requestPasswordReset
);

authRouter.post(
    '/password-reset/confirm',
    validate(authRequest.confirmPasswordReset),
    authController.confirmPasswordReset
);

export default authRouter;
