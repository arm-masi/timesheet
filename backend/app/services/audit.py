import uuid
import json
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog


async def create_audit_log(
    db: AsyncSession,
    user_id: uuid.UUID,
    action: str,
    entity_type: str,
    entity_id: str,
    old_values: dict | None = None,
    new_values: dict | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    log = AuditLog(
        id=uuid.uuid4(),
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        old_values=json.dumps(old_values, default=str) if old_values else None,
        new_values=json.dumps(new_values, default=str) if new_values else None,
        ip_address=ip_address,
    )
    db.add(log)
    await db.flush()
    return log
