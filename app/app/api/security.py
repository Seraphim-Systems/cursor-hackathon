"""JWT access tokens."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import settings


def create_access_token(*, subject_user_id: str) -> tuple[str, int]:
    """Returns (token, expires_in_seconds)."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.jwt_expire_minutes)
    exp_seconds = int(settings.jwt_expire_minutes * 60)
    payload = {"sub": subject_user_id, "exp": expire, "iat": now}
    token = jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return token, exp_seconds


def decode_subject(token: str) -> str:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as e:
        raise ValueError("invalid token") from e
    sub = payload.get("sub")
    if not isinstance(sub, str):
        raise ValueError("invalid token payload")
    return sub
