from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class AuditLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    action: str
    entity_type: str
    entity_id: str
    old_values: str | None = None
    new_values: str | None = None
    ip_address: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
