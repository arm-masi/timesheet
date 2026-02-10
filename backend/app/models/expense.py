import uuid
import enum
from sqlalchemy import String, Text, Float, Date, DateTime, ForeignKey, Enum as SAEnum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ExpenseType(str, enum.Enum):
    VIAGGIO = "viaggio"
    AUTOSTRADA = "autostrada"
    SOGGIORNO = "soggiorno"
    PARCHEGGIO = "parcheggio"
    PASTI = "pasti"
    ALTRO = "altro"


class ExpenseStatus(str, enum.Enum):
    IN_ATTESA = "in_attesa"
    APPROVATO = "approvato"
    RIFIUTATO = "rifiutato"


class ExpenseReport(Base):
    """A single expense report containing multiple line items."""
    __tablename__ = "expense_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    date_from: Mapped[str] = mapped_column(Date, nullable=False)
    date_to: Mapped[str] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Totals (calculated from items)
    total_expenses: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    total_km_reimbursement: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    grand_total: Mapped[float] = mapped_column(Float, default=0, nullable=False)

    # Receipt upload (PDF only)
    receipt_filename: Mapped[str | None] = mapped_column(String(500), nullable=True)
    receipt_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    status: Mapped[ExpenseStatus] = mapped_column(SAEnum(ExpenseStatus), default=ExpenseStatus.IN_ATTESA, nullable=False)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    items = relationship("ExpenseItem", back_populates="report", cascade="all, delete-orphan", lazy="selectin")


class ExpenseItem(Base):
    """A single line item within an expense report."""
    __tablename__ = "expense_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("expense_reports.id", ondelete="CASCADE"), nullable=False, index=True)

    expense_type: Mapped[ExpenseType] = mapped_column(SAEnum(ExpenseType), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)

    # Mileage (optional per item)
    km: Mapped[float | None] = mapped_column(Float, nullable=True)
    cost_per_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    km_total: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

    report = relationship("ExpenseReport", back_populates="items")
