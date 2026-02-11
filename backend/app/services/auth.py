import uuid
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import get_settings
from app.models.user import User, UserRole, AuthProvider

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, email: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


async def authenticate_local_user(db: AsyncSession, username: str, password: str) -> User | None:
    result = await db.execute(
        select(User).where(User.username == username, User.auth_provider == AuthProvider.LOCAL)
    )
    user = result.scalar_one_or_none()
    if user is None or user.hashed_password is None:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def get_or_create_azure_user(db: AsyncSession, email: str, full_name: str, azure_oid: str) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is not None:
        if user.azure_oid is None:
            user.azure_oid = azure_oid
            user.full_name = full_name
            await db.flush()
        return user

    user = User(
        id=uuid.uuid4(),
        email=email,
        full_name=full_name,
        azure_oid=azure_oid,
        role=UserRole.EMPLOYEE,
        auth_provider=AuthProvider.AZURE_AD,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    return user


async def ensure_admin_exists(db: AsyncSession) -> None:
    result = await db.execute(
        select(User).where(User.username == "admin", User.auth_provider == AuthProvider.LOCAL)
    )
    admin = result.scalar_one_or_none()
    if admin is None:
        admin = User(
            id=uuid.uuid4(),
            email="admin@local",
            full_name="System Administrator",
            username="admin",
            hashed_password=hash_password(settings.ADMIN_DEFAULT_PASSWORD),
            role=UserRole.ADMIN,
            auth_provider=AuthProvider.LOCAL,
            is_active=True,
        )
        db.add(admin)
        await db.commit()
