import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import require_admin, get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, UpdateOfficeLocation

from app.models.user import OfficeLocation

router = APIRouter(prefix="/api/users", tags=["users"])

OFFICE_LOCATIONS_INFO = {
    OfficeLocation.MILANO_FARA: {
        "key": OfficeLocation.MILANO_FARA.value,
        "label": "Milano - Via Gustavo Fara",
        "address": "Via Gustavo Fara, 35, 20124 Milano",
        "patron_saint": "Sant'Ambrogio",
        "patron_saint_date": "7 dicembre",
    },
    OfficeLocation.NAPOLI_IMMACOLATA: {
        "key": OfficeLocation.NAPOLI_IMMACOLATA.value,
        "label": "Napoli - Piazza dell'Immacolata",
        "address": "Piazza dell'Immacolata, 4, 80129 Napoli",
        "patron_saint": "San Gennaro",
        "patron_saint_date": "19 settembre",
    },
    OfficeLocation.NAPOLI_MASCAGNI: {
        "key": OfficeLocation.NAPOLI_MASCAGNI.value,
        "label": "Napoli - Via Mascagni",
        "address": "Via Mascagni, 64, 80128 Napoli",
        "patron_saint": "San Gennaro",
        "patron_saint_date": "19 settembre",
    },
}


@router.get("/office-locations")
async def list_office_locations():
    """Get available office locations with patron saint info."""
    return list(OFFICE_LOCATIONS_INFO.values())


@router.get("/", response_model=list[UserResponse])
async def list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: list all users."""
    result = await db.execute(select(User).order_by(User.full_name))
    return [UserResponse.model_validate(u) for u in result.scalars().all()]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: get a user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(user)


@router.put("/me/office-location", response_model=UserResponse)
async def update_my_office_location(
    body: UpdateOfficeLocation,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Employee: set own office location."""
    current_user.office_location = body.office_location
    await db.flush()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: update a user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if body.full_name is not None:
        user.full_name = body.full_name
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.office_location is not None:
        user.office_location = body.office_location

    await db.flush()
    return UserResponse.model_validate(user)
