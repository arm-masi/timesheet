from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime
from app.models.justification import JustificationType, JustificationStatus


class JustificationCreate(BaseModel):
    date: date
    type: JustificationType
    reason: str | None = None


class JustificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    date: date
    type: JustificationType
    status: JustificationStatus
    reason: str | None = None
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    user_name: str | None = None

    model_config = {"from_attributes": True}


class JustificationReview(BaseModel):
    status: JustificationStatus
