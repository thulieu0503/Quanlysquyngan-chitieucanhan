import hashlib
import hmac
import secrets

from app.config import settings


def generate_otp() -> str:
    code = secrets.randbelow(10**settings.OTP_LENGTH)
    return str(code).zfill(settings.OTP_LENGTH)


def hash_otp(user_id: int, code: str) -> str:
    message = f"{user_id}:{code}".encode()
    return hmac.new(settings.JWT_SECRET.encode(), message, hashlib.sha256).hexdigest()


def otp_matches(user_id: int, code: str, token: str) -> bool:
    expected = hash_otp(user_id, code)
    return hmac.compare_digest(expected, token)
