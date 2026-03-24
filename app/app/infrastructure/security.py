"""Password hashing and JWT access tokens."""

from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(*, subject_user_id: str) -> tuple[str, int]:
    """Returns (jwt, expires_in_seconds)."""
    expires_delta = timedelta(minutes=settings.jwt_expire_minutes)
    expire = datetime.now(UTC) + expires_delta
    expires_in = int(expires_delta.total_seconds())
    payload = {"sub": subject_user_id, "exp": expire}
    token = jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return token, expires_in


def decode_subject(token: str) -> str | None:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        sub = payload.get("sub")
        if sub is None or not isinstance(sub, str):
            return None
        return sub
    except JWTError:
        return None
