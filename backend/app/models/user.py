import uuid
from sqlalchemy import String, Boolean, Enum as SAEnum, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    EMPLOYEE = "employee"
    ADMIN = "admin"


class AuthProvider(str, enum.Enum):
    LOCAL = "local"
    AZURE_AD = "azure_ad"


class OfficeLocation(str, enum.Enum):
    MILANO_FARA = "milano_fara"
    NAPOLI_IMMACOLATA = "napoli_immacolata"
    NAPOLI_MASCAGNI = "napoli_mascagni"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    username: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    auth_provider: Mapped[AuthProvider] = mapped_column(SAEnum(AuthProvider), default=AuthProvider.AZURE_AD, nullable=False)
    azure_oid: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    office_location: Mapped[OfficeLocation | None] = mapped_column(SAEnum(OfficeLocation), nullable=True, default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    attendances = relationship("Attendance", back_populates="user", lazy="selectin")
    justifications = relationship("Justification", back_populates="user", lazy="selectin", foreign_keys="[Justification.user_id]")
