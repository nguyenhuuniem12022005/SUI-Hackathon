import * as userService from '../services/userService.js';
import { getBalance as getUserBalanceInternal } from '../services/userBalanceService.js';
export async function createUser(req, res) {
    const newUser = await userService.createUser(req.body);

    res.status(201).json({
        success: true,
        message: 'Tạo người dùng thành công!',
        user: {
            fullName: newUser.lastName + " " + newUser.firstName,
            userName: newUser.userName,
        }
    });
}

export async function resetPassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    await userService.changePassword(req.user.userId, currentPassword, newPassword);

    res.json({
        success: true,
        message: 'Thay đổi mật khẩu thành công!'
    });
}

export async function updateUserName(req, res) {
    await userService.updateUserName(req.user.userId, req.body.userName);

    res.json({
        success: true,
        message: 'Cập nhật UserName thành công!'
    })
}

export async function updatePhone(req, res) {
    await userService.updatePhone(req.user.userId, req.body.phone);

    res.json({
        success: true,
        message: 'Cập nhật số điện thoại thành công!'
    });
}

export async function updateAddress(req, res) {
    await userService.updateAddress(req.user.userId, req.body.address);

    res.json({
        success: true,
        message: 'Cập nhật địa chỉ thành công!'
    });
}

export async function uploadAvatar(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Không có file ảnh nào được upload!'
    });
  }

  const imagePath = `public/uploads/${req.file.filename}`;
  await userService.uploadAvatar(req.user.userId, imagePath);

  res.json({
    success: true,
    message: 'Upload avatar thành công!',
    avatarUrl: `/uploads/${req.file.filename}`
  });
}

export async function updateReputationScore(req, res) {
    await userService.updateReputationScore(req.user.userId, req.body.amount);

    res.json({
        success: true,
        message: 'Cập nhật reputation score thành công!'
    });
}

export async function updateGreenCredit(req, res) {
    await userService.updateGreenCredit(req.user.userId, req.body.amount);

    res.json({
        success: true,
        message: 'Cập nhật green credit thành công!'
    });
}

export async function convertGreenCredit(req, res, next) {
    try {
        const { amount } = req.body;
        const data = await userService.convertGreenCreditToReputation(req.user.userId, amount);
        res.status(200).json({
            success: true,
            message: 'Đã quy đổi green credit sang điểm uy tín.',
            data,
        });
    } catch (error) {
        next(error);
    }
}

export async function updateDateOfBirth(req, res) {
    await userService.updateDateOfBirth(req.user.userId, req.body.dateOfBirth);

    res.json({
        success: true,
        message: 'Cập nhật ngày sinh thành công!'
    });
}

// THÊM HÀM MỚI: API lấy dashboard data
export async function getDashboardData(req, res) {
    const dashboardData = await userService.getUserDashboardData(req.user.userId);

    res.json({
        success: true,
        data: dashboardData
    });
}

export async function listReputationLedger(req, res, next) {
  try {
    const data = await userService.listReputationLedger(req.user.userId, req.query.limit);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function listNotifications(req, res, next) {
  try {
    const data = await userService.listNotifications(req.user.userId, {
      since: req.query.since,
      limit: req.query.limit,
    });
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationsRead(req, res, next) {
  try {
    await userService.markNotificationsRead(req.user.userId, req.body.ids || []);
    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
}

export async function getWalletInfo(req, res, next) {
  try {
    const data = await userService.getWalletInfo(req.user.userId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

// Lấy số dư off-chain (available + locked)

export async function getUserBalance(req, res, next) {
  try {
    const balance = await getUserBalanceInternal(req.user.userId);
    return res.status(200).json({ success: true, data: balance });
  } catch (error) {
    return next(error);
  }
}

export async function redeemGreenBadge(req, res, next) {
  try {
    const data = await userService.redeemGreenBadge(req.user.userId);
    return res.status(200).json({
      success: true,
      message: 'Đã đổi huy hiệu xanh thành công',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function connectWallet(req, res, next) {
  try {
    const data = await userService.connectWallet(req.user.userId, req.body);
    return res.status(200).json({
      success: true,
      message: 'Liên kết ví thành công!',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function disconnectWallet(req, res, next) {
  try {
    await userService.disconnectWallet(req.user.userId);
    return res.status(200).json({
      success: true,
      message: 'Đã hủy liên kết ví HScoin.',
    });
  } catch (error) {
    return next(error);
  }
}

export async function listMyReviews(req, res, next) {
  try {
    const data = await userService.listMyReviews(req.user.userId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listMonthlyLeaderboard(req, res, next) {
  try {
    const days = req.query.days ? Number(req.query.days) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const data = await userService.listMonthlyLeaderboard({ days, limit });
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}
