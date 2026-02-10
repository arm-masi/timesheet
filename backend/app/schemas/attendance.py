from pydantic import BaseModel
from uuid import UUID
from datetime import date, time, datetime


class AttendanceBase(BaseModel):
    date: date
    clock_in: time | None = None
    clock_out: time | None = None
    notes: str | None = None


class ClockInRequest(BaseModel):
    notes: str | None = None


class ClockOutRequest(BaseModel):
    notes: str | None = None


class AttendanceResponse(AttendanceBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AttendanceAdminUpdate(BaseModel):
    clock_in: time | None = None
    clock_out: time | None = None
    notes: str | None = None


class DailySummary(BaseModel):
    date: date
    clock_in: time | None = None
    clock_out: time | None = None
    worked_hours: float = 0.0
    expected_hours: float = 8.0
    deficit_hours: float = 0.0
    has_justification: bool = False
    justification_type: str | None = None
    justification_status: str | None = None
    is_missing: bool = False


class MonthlySummary(BaseModel):
    year: int
    month: int
    user_id: UUID
    user_name: str
    total_worked_days: int = 0
    total_ferie_days: int = 0
    total_permesso_days: int = 0
    total_missing_days: int = 0
    total_hours: float = 0.0
    daily_details: list[DailySummary] = []
