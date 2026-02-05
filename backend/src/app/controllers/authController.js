import * as authService from '../services/authService.js';
import * as userService from '../services/userService.js';
import * as passwordResetService from '../services/passwordResetService.js';

// ======================= ĐĂNG KÝ =======================
export async function register(req, res) {
  try {
    const newUser = await authService.register(req.body);
    const tokenInfo = authService.authToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Đăng ký người dùng thành công!',
      user: {
        userId: newUser.userId,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        fullName: `${newUser.firstName || ''} ${newUser.lastName || ''}`.trim(),
        userName: newUser.userName,
        email: newUser.email,
        phone: newUser.phone || '', // Thêm phone
        address: newUser.address || '', // Thêm address
        avatar: newUser.avatar || '/avatar.png',
        referralToken: newUser.referralToken,
        referredByToken: newUser.referredByToken || '',
        reputationScore: Number(newUser.reputationScore) || 100,
        greenCredit: Number(newUser.greenCredit) || 0,
      },
      token: tokenInfo,
    });
  } catch (error) {
    console.error('[Register Error]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Đăng ký thất bại!',
    });
  }
}

// ======================= ĐĂNG NHẬP (ĐÃ SỬA) =======================
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const validLogin = await authService.checkValidLogin(email, password);

    if (!validLogin) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng!',
      });
    }

    const tokenInfo = authService.authToken(validLogin);

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      user: {
        userId: validLogin.userId,
        firstName: validLogin.firstName,
        lastName: validLogin.lastName,
        fullName: `${validLogin.firstName || ''} ${validLogin.lastName || ''}`.trim(),
        userName: validLogin.userName,
        email: validLogin.email,
        // ✅ THÊM CÁC TRƯỜNG PHONE VÀ ADDRESS
        phone: validLogin.phone || '', 
        address: validLogin.address || '', 
        avatar: validLogin.avatar || '/avatar.png',
        referralToken: validLogin.referralToken,
        referredByToken: validLogin.referredByToken || '',
        reputationScore: Number(validLogin.reputationScore) || 0,
        greenCredit: Number(validLogin.greenCredit) || 0,
      },
      token: tokenInfo,
    });
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Đăng nhập thất bại!',
    });
  }
}

// ======================= ĐĂNG XUẤT =======================
export async function logout(req, res) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (token) authService.blockToken(token);

    res.json({
      success: true,
      message: 'Thoát đăng nhập thành công!',
    });
  } catch (error) {
    console.error('[Logout Error]', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đăng xuất!',
    });
  }
}

// ======================= ĐỔI MẬT KHẨU =======================
export async function resetPassword(req, res) {
  try {
    const { email } = req.params;
    const { password } = req.body;

    await userService.resetPassword(email, password);

    res.json({
      success: true,
      message: 'Thay đổi mật khẩu thành công!',
    });
  } catch (error) {
    console.error('[Reset Password Error]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Không thể thay đổi mật khẩu!',
    });
  }
}

export async function requestPasswordReset(req, res, next) {
  try {
    const { email } = req.body;
    const data = await passwordResetService.requestPasswordReset(email);
    return res.status(200).json({
      success: true,
      message: 'Đã gửi hướng dẫn đặt lại mật khẩu qua email.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function confirmPasswordReset(req, res, next) {
  try {
    const { token, password } = req.body;
    await passwordResetService.confirmPasswordReset(token, password);
    return res.status(200).json({
      success: true,
      message: 'Đã cập nhật mật khẩu mới. Vui lòng đăng nhập lại.',
    });
  } catch (error) {
    return next(error);
  }
}

// ======================= WALLET LOGIN =======================
export async function walletLogin(req, res) {
  try {
    const { walletAddress, signature, message, timestamp } = req.body;

    if (!walletAddress || !signature || !message || !timestamp) {
      return res.status(400).json({
        success: false,
        message: 'Missing required wallet authentication data.',
      });
    }

    // Validate wallet address format (SUI addresses start with 0x and are 66 chars)
    if (!walletAddress.startsWith('0x') || walletAddress.length !== 66) {
      return res.status(400).json({
        success: false,
        message: 'Invalid SUI wallet address format.',
      });
    }

    const user = await authService.loginOrRegisterWithWallet({
      walletAddress,
      signature,
      message,
      timestamp,
    });

    const tokenInfo = authService.authToken(user);

    res.status(200).json({
      success: true,
      message: 'Đăng nhập bằng ví thành công!',
      user: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        userName: user.userName,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        avatar: user.avatar || '/avatar.png',
        referralToken: user.referralToken,
        reputationScore: Number(user.reputationScore) || 0,
        greenCredit: Number(user.greenCredit) || 0,
        walletAddress: user.walletAddress,
      },
      token: tokenInfo,
    });
  } catch (error) {
    console.error('[Wallet Login Error]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Đăng nhập bằng ví thất bại!',
    });
  }
}
