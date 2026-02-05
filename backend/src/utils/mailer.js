import nodemailer from 'nodemailer';

/**
 * Mail helper: ưu tiên Resend nếu có RESEND_API_KEY, nếu không dùng SMTP (Mailtrap/Gmail).
 * SMTP env cần: MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD, MAIL_FROM.
 */
export async function sendMail({ to, subject, html, text }) {
  if (!to) throw new Error('Thiếu địa chỉ người nhận');
  const from = process.env.MAIL_FROM || 'P-Market <no-reply@pmarket.local>';

  // 1) SMTP (Mailtrap/Gmail) nếu đã cấu hình đầy đủ
  if (process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASSWORD) {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT || 587),
      secure: process.env.MAIL_SECURE === 'true', // Mailtrap: false với 2525/587
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from,
      to,
      subject: subject || '',
      html: html || '',
      text: text || '',
    });
    return;
  }

  // 2) Resend HTTP API nếu có API key
  if (process.env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: subject || '',
        html: html || '',
        text: text || '',
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || data?.message || 'Gửi email thất bại (Resend)';
      throw new Error(message);
    }
    return data;
  }

  // 3) Không có cấu hình nào
  throw new Error('MAIL_HOST/USER/PASSWORD hoặc RESEND_API_KEY chưa được cấu hình');
}
