from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import require_admin
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.audit import AuditLogResponse

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/logs", response_model=list[AuditLogResponse])
async def get_audit_logs(
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: get audit logs."""
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    )
    return [AuditLogResponse.model_validate(log) for log in result.scalars().all()]
