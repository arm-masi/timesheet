from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import date, datetime
from app.models.expense import ExpenseType, ExpenseStatus


class ExpenseItemCreate(BaseModel):
    expense_type: ExpenseType
    description: str
    amount: float
    km: float | None = None
    cost_per_km: float | None = None


class ExpenseItemResponse(BaseModel):
    id: UUID
    expense_type: ExpenseType
    description: str
    amount: float
    km: float | None = None
    cost_per_km: float | None = None
    km_total: float | None = None

    model_config = {"from_attributes": True}


class ExpenseReportCreate(BaseModel):
    date_from: date
    date_to: date
    description: str | None = None
    items: list[ExpenseItemCreate]

    @field_validator("items")
    @classmethod
    def at_least_one_item(cls, v: list) -> list:
        if len(v) == 0:
            raise ValueError("Almeno una voce di spesa e' richiesta")
        return v


class ExpenseReportResponse(BaseModel):
    id: UUID
    user_id: UUID
    date_from: date
    date_to: date
    description: str | None = None
    total_expenses: float
    total_km_reimbursement: float
    grand_total: float
    receipt_filename: str | None = None
    status: ExpenseStatus
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    items: list[ExpenseItemResponse] = []
    user_name: str | None = None

    model_config = {"from_attributes": True}


class ExpenseReview(BaseModel):
    status: ExpenseStatus
