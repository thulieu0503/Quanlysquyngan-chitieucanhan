import logging
from email.message import EmailMessage
from html import escape as escape_html

import aiosmtplib

from app.config import settings

logger = logging.getLogger("app.mail")


async def send_mail(to: str, subject: str, text: str, html: str) -> None:
    if not settings.SMTP_HOST:
        if settings.ENV == "production":
            raise RuntimeError("SMTP_HOST chưa được cấu hình")
        logger.info("[mail:dev] chưa cấu hình SMTP, in nội dung ra console\nTo: %s\nSubject: %s\n%s", to, subject, text)
        return

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text)
    message.add_alternative(html, subtype="html")

    # secure = cổng 465 (implicit TLS); các cổng khác dùng STARTTLS nếu server hỗ trợ,
    # nhưng không bắt buộc (start_tls=None) — giống hành vi mặc định của nodemailer,
    # để vẫn gửi được qua Mailpit (dev) vốn không hỗ trợ STARTTLS.
    use_tls = settings.SMTP_PORT == 465
    await aiosmtplib.send(
        message,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER or None,
        password=settings.SMTP_PASSWORD or None,
        use_tls=use_tls,
        start_tls=None if not use_tls else False,
    )


def build_reset_code_mail(name: str, code: str) -> tuple[str, str, str]:
    """Returns (subject, text, html) — ported from lib/mail.ts buildResetCodeMail."""
    valid_minutes = settings.OTP_VALID_MINUTES
    subject = f"{code} là mã đặt lại mật khẩu VíVàng của bạn"
    text = "\n".join(
        [
            f"Xin chào {name},",
            "",
            "Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản VíVàng.",
            f"Mã xác nhận của bạn: {code}",
            f"Mã có hiệu lực trong {valid_minutes} phút. Không chia sẻ mã này cho bất kỳ ai.",
            "",
            "Nếu không phải bạn yêu cầu, hãy bỏ qua email này — mật khẩu hiện tại vẫn giữ nguyên.",
        ]
    )
    html = f"""<div style="font-family:Arial,sans-serif;line-height:1.6;color:#211C14">
  <p>Xin chào {escape_html(name)},</p>
  <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản VíVàng. Mã xác nhận của bạn là:</p>
  <p style="display:inline-block;margin:4px 0;padding:14px 24px;background:#FBF8F1;border:1px solid #E7E0D2;border-radius:10px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#1F6E4A">{escape_html(code)}</p>
  <p>Mã có hiệu lực trong {valid_minutes} phút. Không chia sẻ mã này cho bất kỳ ai.</p>
  <p style="color:#7A7264">Nếu không phải bạn yêu cầu, hãy bỏ qua email này — mật khẩu hiện tại vẫn giữ nguyên.</p>
</div>"""
    return subject, text, html
