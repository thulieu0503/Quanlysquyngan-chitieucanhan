from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "finance_user"
    DB_PASSWORD: str = "finance_password"
    DB_NAME: str = "finance_app"

    JWT_SECRET: str = "dev-secret-change-me"
    JWT_COOKIE_NAME: str = "access_token"
    JWT_MAX_AGE_SECONDS: int = 60 * 60 * 24 * 7

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "VíVàng <no-reply@vivang.app>"

    CORS_ORIGIN: str = "http://localhost:3000"
    ENV: str = "development"

    OTP_LENGTH: int = 6
    OTP_VALID_MINUTES: int = 15
    OTP_MAX_ATTEMPTS: int = 5
    OTP_RESEND_SECONDS: int = 60

    BCRYPT_ROUNDS: int = 10


settings = Settings()
