import { Router } from 'express';
import * as userController from '../app/controllers/userController.js';
import requireAuthentication from '../app/middleware/common/require-authentication.js';
import validate from '../app/middleware/common/validate.js';
import * as userRequest from '../app/requests/userRequest.js';
import { upload } from '../app/middleware/uploadMiddleware.js';

const userRouter = Router();

userRouter.use(requireAuthentication);

const resetPasswordHandlers = [
    validate(userRequest.resetPassword),
    userController.resetPassword,
];

userRouter.post('/me/reset-password', resetPasswordHandlers);

userRouter.patch('/me/update-password', resetPasswordHandlers);

userRouter.patch(
    '/me/update-username',
    validate(userRequest.updateUserName),
    userController.updateUserName
);

userRouter.patch(
    '/me/update-phone',
    validate(userRequest.updatePhone),
    userController.updatePhone
);

userRouter.patch(
    '/me/update-address',
    validate(userRequest.updateAddress),
    userController.updateAddress
);

userRouter.patch(
    '/me/upload-avatar',
    upload.single('avatar'),
    userController.uploadAvatar
);

userRouter.patch(
    '/me/update-reputation-score',
    validate(userRequest.updateReputationScore),
    userController.updateReputationScore
);

userRouter.patch(
    '/me/update-green-credit',
    validate(userRequest.updateGreenCredit),
    userController.updateGreenCredit
);

userRouter.post(
    '/me/convert-green-credit',
    validate(userRequest.convertGreenCredit),
    userController.convertGreenCredit
);

userRouter.get(
    '/me/reputation-ledger',
    userController.listReputationLedger
);

userRouter.get(
    '/me/notifications',
    userController.listNotifications
);

userRouter.patch(
    '/me/notifications/read',
    userController.markNotificationsRead
);

userRouter.patch(
    '/me/update-date-of-birth',
    validate(userRequest.updateDateOfBirth),
    userController.updateDateOfBirth
);

// THÊM ROUTE MỚI
userRouter.get(
    '/me/dashboard',
    userController.getDashboardData
);

userRouter.get(
    '/me/wallet',
    userController.getWalletInfo
);

// Số dư off-chain
userRouter.get(
    '/me/balance',
    userController.getUserBalance
);

userRouter.post(
    '/me/wallet/connect',
    validate(userRequest.connectWallet),
    userController.connectWallet
);

userRouter.delete(
    '/me/wallet/connect',
    userController.disconnectWallet
);

userRouter.post(
  '/me/green-badge/redeem',
  userController.redeemGreenBadge
);

// Lịch sử đánh giá của chính user
userRouter.get(
  '/me/reviews',
  userController.listMyReviews
);

// Bảng xếp hạng theo tháng (dựa trên delta reputation/green credit)
userRouter.get(
  '/leaderboard/monthly',
  userController.listMonthlyLeaderboard
);

export default userRouter;
