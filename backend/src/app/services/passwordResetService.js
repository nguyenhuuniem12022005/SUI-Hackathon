import { sendMail } from '../../utils/mailer.js';
import {
  createPasswordResetRequest,
  verifyPasswordResetToken,
  markPasswordResetUsed,
  setPasswordForUser,
} from './userService.js';
import ApiError from '../../utils/classes/api-error.js';

function buildResetLink(token) {
  const base = process.env.PASSWORD_RESET_URL || 'https://p-market-1.onrender.com/auth/reset-password';
  try {
    const url = new URL(base);
    url.searchParams.set('token', token);
    return url.toString();
  } catch {
    return `${base}?token=${token}`;
  }
}

export async function requestPasswordReset(email) {
  const { token, user, expiresAt } = await createPasswordResetRequest(email);
  const resetLink = buildResetLink(token);
  const minutes = Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000);

  await sendMail({
    to: user.email,
    subject: 'P-Market - Hướng dẫn đặt lại mật khẩu',
    text: `Xin chào ${user.firstName || ''},

Bạn nhận được email này vì đã yêu cầu đặt lại mật khẩu P-Market. Nhấp vào liên kết sau để đặt mật khẩu mới:
${resetLink}

Liên kết sẽ hết hạn trong ${minutes} phút. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.`,
    html: `
      <p>Xin chào ${user.firstName || user.lastName || 'bạn'},</p>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu P-Market. Nhấp vào nút bên dưới để đặt mật khẩu mới:</p>
      <p style="text-align:center;margin:24px 0;">
        <a style="background:#e11d48;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;" href="${resetLink}" target="_blank">
          Đặt lại mật khẩu
        </a>
      </p>
      <p>Liên kết sẽ tự động hết hạn trong ${minutes} phút. Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.</p>
      <p>Trân trọng,<br/>Đội ngũ P-Market</p>
    `,
  });

  return { email: user.email, expiresAt };
}

export async function confirmPasswordReset(token, newPassword) {
  if (!token) {
    throw ApiError.badRequest('Thiếu mã xác nhận');
  }
  const entry = await verifyPasswordResetToken(token);
  await setPasswordForUser(entry.userId, newPassword);
  await markPasswordResetUsed(entry.resetId);
  return { userId: entry.userId };
}
