"""Registration and credential verification."""

from __future__ import annotations

from app.infrastructure.persistence.documents import UserDocument
from app.infrastructure.persistence.repositories import UserRepository


class AuthFacade:
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def register(self, *, email: str, password: str) -> UserDocument:
        normalized = email.lower().strip()
        if await self._users.get_by_email(normalized):
            raise ValueError("email already registered")
        from app.infrastructure.security.passwords import hash_password

        return await self._users.create(email=normalized, hashed_password=hash_password(password))

    async def verify_login(self, *, email: str, password: str) -> UserDocument | None:
        user = await self._users.get_by_email(email.lower().strip())
        if user is None:
            return None
        from app.infrastructure.security.passwords import verify_password

        if not verify_password(password, user.hashed_password):
            return None
        return user
