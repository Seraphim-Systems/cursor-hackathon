"""JWT access tokens (HS256)."""

from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt

from app.config import settings


def create_access_token(*, subject_user_id: str) -> tuple[str, int]:
    """Return (token, expires_in_seconds)."""
    expires_in = settings.jwt_expire_minutes * 60
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": subject_user_id,
        "exp": expire,
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, expires_in


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as e:
        raise ValueError("invalid token") from e


def decode_subject(token: str) -> str | None:
    """Return JWT `sub` (user id) or None if invalid/expired."""
    try:
        payload = decode_access_token(token)
    except ValueError:
        return None
    sub = payload.get("sub")
    return sub if isinstance(sub, str) else None
