import nodemailer from "nodemailer";

type Mail = { to: string; subject: string; text: string; html: string };

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendMail(mail: Mail): Promise<void> {
  const host = process.env.SMTP_HOST;

  if (!host) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP_HOST chưa được cấu hình");
    console.info(`[mail:dev] chưa cấu hình SMTP, in nội dung ra console\nTo: ${mail.to}\nSubject: ${mail.subject}\n${mail.text}`);
    return;
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass: process.env.SMTP_PASSWORD } : undefined,
  });

  await transporter.sendMail({ from: process.env.SMTP_FROM, ...mail });
}

export function buildResetCodeMail(input: { to: string; name: string; code: string; validMinutes: number }): Mail {
  const { to, name, code, validMinutes } = input;
  return {
    to,
    subject: `${code} là mã đặt lại mật khẩu VíVàng của bạn`,
    text: [
      `Xin chào ${name},`,
      "",
      "Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản VíVàng.",
      `Mã xác nhận của bạn: ${code}`,
      `Mã có hiệu lực trong ${validMinutes} phút. Không chia sẻ mã này cho bất kỳ ai.`,
      "",
      "Nếu không phải bạn yêu cầu, hãy bỏ qua email này — mật khẩu hiện tại vẫn giữ nguyên.",
    ].join("\n"),
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#211C14">
  <p>Xin chào ${escapeHtml(name)},</p>
  <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản VíVàng. Mã xác nhận của bạn là:</p>
  <p style="display:inline-block;margin:4px 0;padding:14px 24px;background:#FBF8F1;border:1px solid #E7E0D2;border-radius:10px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#1F6E4A">${escapeHtml(code)}</p>
  <p>Mã có hiệu lực trong ${validMinutes} phút. Không chia sẻ mã này cho bất kỳ ai.</p>
  <p style="color:#7A7264">Nếu không phải bạn yêu cầu, hãy bỏ qua email này — mật khẩu hiện tại vẫn giữ nguyên.</p>
</div>`,
  };
}
