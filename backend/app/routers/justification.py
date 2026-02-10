import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user, require_admin
from app.models.user import User
from app.models.justification import Justification, JustificationStatus
from app.schemas.justification import JustificationCreate, JustificationResponse, JustificationReview
from app.services.audit import create_audit_log

router = APIRouter(prefix="/api/justifications", tags=["justifications"])


@router.post("/", response_model=JustificationResponse, status_code=status.HTTP_201_CREATED)
async def create_justification(
    body: JustificationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Employee: create a justification request (ferie/permesso)."""
    # Check if justification already exists for this date
    existing = await db.execute(
        select(Justification).where(
            and_(Justification.user_id == current_user.id, Justification.date == body.date)
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Justification already exists for this date",
        )

    justification = Justification(
        id=uuid.uuid4(),
        user_id=current_user.id,
        date=body.date,
        type=body.type,
        status=JustificationStatus.IN_ATTESA,
        reason=body.reason,
    )
    db.add(justification)
    await db.flush()
    await create_audit_log(
        db, current_user.id, "create_justification", "justification", str(justification.id),
        new_values={"type": body.type.value, "date": str(body.date)},
    )

    resp = JustificationResponse.model_validate(justification)
    resp.user_name = current_user.full_name
    return resp


@router.get("/my", response_model=list[JustificationResponse])
async def get_my_justifications(
    year: int | None = None,
    month: int | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Employee: get own justifications."""
    query = select(Justification).where(Justification.user_id == current_user.id)

    if year and month:
        from datetime import date
        from calendar import monthrange
        _, num_days = monthrange(year, month)
        start = date(year, month, 1)
        end = date(year, month, num_days)
        query = query.where(and_(Justification.date >= start, Justification.date <= end))

    query = query.order_by(Justification.date.desc())
    result = await db.execute(query)
    justifications = result.scalars().all()
    response = []
    for j in justifications:
        resp = JustificationResponse.model_validate(j)
        resp.user_name = current_user.full_name
        response.append(resp)
    return response


@router.delete("/{justification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_justification(
    justification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Employee: delete own pending justification."""
    result = await db.execute(
        select(Justification).where(
            and_(Justification.id == justification_id, Justification.user_id == current_user.id)
        )
    )
    justification = result.scalar_one_or_none()
    if justification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Justification not found")

    if justification.status not in (JustificationStatus.IN_ATTESA, JustificationStatus.INSERITO):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a reviewed justification",
        )

    await db.delete(justification)
    await db.flush()


# ---- Admin endpoints ----

@router.get("/admin/all", response_model=list[JustificationResponse])
async def admin_get_all_justifications(
    status_filter: JustificationStatus | None = None,
    user_id: uuid.UUID | None = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: get all justifications with optional filters."""
    query = select(Justification).join(User, Justification.user_id == User.id)

    if status_filter:
        query = query.where(Justification.status == status_filter)
    if user_id:
        query = query.where(Justification.user_id == user_id)

    query = query.order_by(Justification.created_at.desc())
    result = await db.execute(query)
    justifications = result.scalars().all()

    response = []
    for j in justifications:
        resp = JustificationResponse.model_validate(j)
        # Load user name
        user_result = await db.execute(select(User).where(User.id == j.user_id))
        user = user_result.scalar_one_or_none()
        resp.user_name = user.full_name if user else None
        response.append(resp)
    return response


@router.put("/admin/{justification_id}/review", response_model=JustificationResponse)
async def admin_review_justification(
    justification_id: uuid.UUID,
    body: JustificationReview,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: approve or reject a justification."""
    if body.status not in (JustificationStatus.APPROVATO, JustificationStatus.RIFIUTATO):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'approvato' or 'rifiutato'",
        )

    result = await db.execute(select(Justification).where(Justification.id == justification_id))
    justification = result.scalar_one_or_none()
    if justification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Justification not found")

    old_status = justification.status.value
    justification.status = body.status
    justification.reviewed_by = admin.id
    justification.reviewed_at = datetime.now(timezone.utc)
    await db.flush()

    await create_audit_log(
        db, admin.id, "review_justification", "justification", str(justification_id),
        old_values={"status": old_status},
        new_values={"status": body.status.value},
        ip_address=request.client.host if request.client else None,
    )

    resp = JustificationResponse.model_validate(justification)
    user_result = await db.execute(select(User).where(User.id == justification.user_id))
    user = user_result.scalar_one_or_none()
    resp.user_name = user.full_name if user else None
    return resp
