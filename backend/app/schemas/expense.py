from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import date, datetime
from app.models.expense import ExpenseType, ExpenseStatus


class ExpenseCreate(BaseModel):
    date: date
    expense_type: ExpenseType
    description: str
    amount: float
    km: float | None = None
    cost_per_km: float | None = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("L'importo deve essere maggiore di zero")
        return round(v, 2)

    @field_validator("km")
    @classmethod
    def km_positive(cls, v: float | None) -> float | None:
        if v is not None and v <= 0:
            raise ValueError("I km devono essere maggiori di zero")
        return v

    @field_validator("cost_per_km")
    @classmethod
    def cost_per_km_positive(cls, v: float | None) -> float | None:
        if v is not None and v <= 0:
            raise ValueError("Il costo al km deve essere maggiore di zero")
        return v


class ExpenseResponse(BaseModel):
    id: UUID
    user_id: UUID
    date: date
    expense_type: ExpenseType
    description: str
    amount: float
    km: float | None = None
    cost_per_km: float | None = None
    km_total: float | None = None
    receipt_filename: str | None = None
    status: ExpenseStatus
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    user_name: str | None = None

    model_config = {"from_attributes": True}


class ExpenseReview(BaseModel):
    status: ExpenseStatus
