import uuid
import enum
from sqlalchemy import Date, String, Text, Enum as SAEnum, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class JustificationType(str, enum.Enum):
    FERIE = "ferie"
    PERMESSO = "permesso"


class JustificationStatus(str, enum.Enum):
    INSERITO = "inserito"
    IN_ATTESA = "in_attesa"
    APPROVATO = "approvato"
    RIFIUTATO = "rifiutato"


class Justification(Base):
    __tablename__ = "justifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    date: Mapped[str] = mapped_column(Date, nullable=False, index=True)
    type: Mapped[JustificationType] = mapped_column(SAEnum(JustificationType), nullable=False)
    status: Mapped[JustificationStatus] = mapped_column(SAEnum(JustificationStatus), default=JustificationStatus.IN_ATTESA, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="justifications", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
