import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user, require_admin
from app.models.user import User
from app.models.attendance import Attendance
from app.schemas.attendance import (
    AttendanceResponse,
    ClockInRequest,
    ClockOutRequest,
    AttendanceAdminUpdate,
    MonthlySummary,
)
from app.services.attendance import clock_in, clock_out, get_monthly_summary, get_attendance_for_date
from app.services.audit import create_audit_log

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


@router.post("/clock-in", response_model=AttendanceResponse)
async def do_clock_in(
    body: ClockInRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clock in for today."""
    try:
        att = await clock_in(db, current_user.id, body.notes)
        await create_audit_log(db, current_user.id, "clock_in", "attendance", str(att.id))
        return AttendanceResponse.model_validate(att)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/clock-out", response_model=AttendanceResponse)
async def do_clock_out(
    body: ClockOutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clock out for today."""
    try:
        att = await clock_out(db, current_user.id, body.notes)
        await create_audit_log(db, current_user.id, "clock_out", "attendance", str(att.id))
        return AttendanceResponse.model_validate(att)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/today", response_model=AttendanceResponse | None)
async def get_today(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get today's attendance for current user."""
    att = await get_attendance_for_date(db, current_user.id, date.today())
    if att is None:
        return None
    return AttendanceResponse.model_validate(att)


@router.get("/my-history", response_model=list[AttendanceResponse])
async def get_my_history(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get attendance history for current user."""
    from calendar import monthrange
    _, num_days = monthrange(year, month)
    start = date(year, month, 1)
    end = date(year, month, num_days)

    result = await db.execute(
        select(Attendance)
        .where(and_(Attendance.user_id == current_user.id, Attendance.date >= start, Attendance.date <= end))
        .order_by(Attendance.date)
    )
    return [AttendanceResponse.model_validate(a) for a in result.scalars().all()]


@router.get("/my-summary", response_model=MonthlySummary)
async def get_my_summary(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get monthly summary for current user."""
    try:
        return await get_monthly_summary(db, current_user.id, year, month)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ---- Admin endpoints ----

@router.get("/admin/user/{user_id}/summary", response_model=MonthlySummary)
async def admin_get_user_summary(
    user_id: uuid.UUID,
    year: int,
    month: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: get monthly summary for any user."""
    try:
        return await get_monthly_summary(db, user_id, year, month)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/admin/{attendance_id}", response_model=AttendanceResponse)
async def admin_update_attendance(
    attendance_id: uuid.UUID,
    body: AttendanceAdminUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: modify an attendance record."""
    result = await db.execute(select(Attendance).where(Attendance.id == attendance_id))
    att = result.scalar_one_or_none()
    if att is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance not found")

    old_values = {
        "clock_in": str(att.clock_in) if att.clock_in else None,
        "clock_out": str(att.clock_out) if att.clock_out else None,
        "notes": att.notes,
    }

    if body.clock_in is not None:
        att.clock_in = body.clock_in
    if body.clock_out is not None:
        att.clock_out = body.clock_out
    if body.notes is not None:
        att.notes = body.notes

    new_values = {
        "clock_in": str(att.clock_in) if att.clock_in else None,
        "clock_out": str(att.clock_out) if att.clock_out else None,
        "notes": att.notes,
    }

    await db.flush()
    await create_audit_log(
        db, admin.id, "admin_update_attendance", "attendance", str(attendance_id),
        old_values=old_values, new_values=new_values,
        ip_address=request.client.host if request.client else None,
    )
    return AttendanceResponse.model_validate(att)


@router.get("/admin/history/{user_id}", response_model=list[AttendanceResponse])
async def admin_get_user_history(
    user_id: uuid.UUID,
    year: int,
    month: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: get attendance history for any user."""
    from calendar import monthrange
    _, num_days = monthrange(year, month)
    start = date(year, month, 1)
    end = date(year, month, num_days)

    result = await db.execute(
        select(Attendance)
        .where(and_(Attendance.user_id == user_id, Attendance.date >= start, Attendance.date <= end))
        .order_by(Attendance.date)
    )
    return [AttendanceResponse.model_validate(a) for a in result.scalars().all()]
