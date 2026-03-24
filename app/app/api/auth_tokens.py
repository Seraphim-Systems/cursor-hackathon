"""JWT and password helpers (HTTP layer — not imported from `domain/`)."""

from datetime import datetime, timedelta, timezone
from typing import Literal

import bcrypt
from jose import jwt

from app.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(*, user_id: str) -> tuple[str, int]:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": user_id, "exp": expire}
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    expires_in = int(timedelta(minutes=settings.jwt_expire_minutes).total_seconds())
    return token, expires_in


def token_type_bearer() -> Literal["bearer"]:
    return "bearer"
