import uuid
import os
from datetime import datetime, timezone, date
from calendar import monthrange
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user, require_admin
from app.models.user import User
from app.models.expense import Expense, ExpenseStatus, ExpenseType
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseReview
from app.services.audit import create_audit_log

router = APIRouter(prefix="/api/expenses", tags=["expenses"])

UPLOAD_DIR = "/app/uploads/receipts"


def _ensure_upload_dir():
    os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    date_str: str = Form(...),
    expense_type: ExpenseType = Form(...),
    description: str = Form(...),
    amount: float = Form(...),
    km: float | None = Form(None),
    cost_per_km: float | None = Form(None),
    receipt: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Employee: create a new expense report."""
    if amount <= 0:
        raise HTTPException(status_code=400, detail="L'importo deve essere maggiore di zero")

    # Validate receipt is PDF
    receipt_filename = None
    receipt_path = None
    if receipt is not None:
        if not receipt.filename or not receipt.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Solo file PDF sono accettati come scontrini")
        if receipt.content_type and receipt.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Solo file PDF sono accettati come scontrini")

        _ensure_upload_dir()
        file_id = str(uuid.uuid4())
        receipt_filename = receipt.filename
        receipt_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")
        content = await receipt.read()
        with open(receipt_path, "wb") as f:
            f.write(content)

    # Calculate km total
    km_total = None
    if km is not None and cost_per_km is not None:
        km_total = round(km * cost_per_km, 2)

    expense = Expense(
        id=uuid.uuid4(),
        user_id=current_user.id,
        date=date_str,
        expense_type=expense_type,
        description=description,
        amount=round(amount, 2),
        km=km,
        cost_per_km=cost_per_km,
        km_total=km_total,
        receipt_filename=receipt_filename,
        receipt_path=receipt_path,
        status=ExpenseStatus.IN_ATTESA,
    )
    db.add(expense)
    await db.flush()
    await db.refresh(expense)

    await create_audit_log(
        db, current_user.id, "create_expense", "expense", str(expense.id),
        new_values={"type": expense_type.value, "amount": amount, "date": date_str},
    )

    resp = ExpenseResponse.model_validate(expense)
    resp.user_name = current_user.full_name
    return resp


@router.get("/my", response_model=list[ExpenseResponse])
async def get_my_expenses(
    year: int | None = None,
    month: int | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Employee: get own expenses."""
    query = select(Expense).where(Expense.user_id == current_user.id)

    if year and month:
        _, num_days = monthrange(year, month)
        start = date(year, month, 1)
        end = date(year, month, num_days)
        query = query.where(and_(Expense.date >= start, Expense.date <= end))

    query = query.order_by(Expense.date.desc())
    result = await db.execute(query)
    expenses = result.scalars().all()
    response = []
    for e in expenses:
        resp = ExpenseResponse.model_validate(e)
        resp.user_name = current_user.full_name
        response.append(resp)
    return response


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Employee: delete own pending expense."""
    result = await db.execute(
        select(Expense).where(and_(Expense.id == expense_id, Expense.user_id == current_user.id))
    )
    expense = result.scalar_one_or_none()
    if expense is None:
        raise HTTPException(status_code=404, detail="Nota spesa non trovata")
    if expense.status != ExpenseStatus.IN_ATTESA:
        raise HTTPException(status_code=400, detail="Non puoi eliminare una nota spesa gia' revisionata")

    # Delete receipt file if exists
    if expense.receipt_path and os.path.exists(expense.receipt_path):
        os.remove(expense.receipt_path)

    await db.delete(expense)
    await db.flush()


@router.get("/receipt/{expense_id}")
async def download_receipt(
    expense_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download a receipt PDF."""
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if expense is None:
        raise HTTPException(status_code=404, detail="Nota spesa non trovata")

    # Employees can only see their own receipts
    from app.models.user import UserRole
    if current_user.role != UserRole.ADMIN and expense.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Non autorizzato")

    if not expense.receipt_path or not os.path.exists(expense.receipt_path):
        raise HTTPException(status_code=404, detail="Scontrino non trovato")

    from fastapi.responses import FileResponse
    return FileResponse(
        expense.receipt_path,
        media_type="application/pdf",
        filename=expense.receipt_filename or "scontrino.pdf",
    )


# ---- Admin endpoints ----

@router.get("/admin/all", response_model=list[ExpenseResponse])
async def admin_get_all_expenses(
    status_filter: ExpenseStatus | None = None,
    user_id: uuid.UUID | None = None,
    year: int | None = None,
    month: int | None = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: get all expenses with optional filters."""
    query = select(Expense)

    if status_filter:
        query = query.where(Expense.status == status_filter)
    if user_id:
        query = query.where(Expense.user_id == user_id)
    if year and month:
        _, num_days = monthrange(year, month)
        start = date(year, month, 1)
        end = date(year, month, num_days)
        query = query.where(and_(Expense.date >= start, Expense.date <= end))

    query = query.order_by(Expense.created_at.desc())
    result = await db.execute(query)
    expenses = result.scalars().all()

    response = []
    for e in expenses:
        resp = ExpenseResponse.model_validate(e)
        user_result = await db.execute(select(User).where(User.id == e.user_id))
        user = user_result.scalar_one_or_none()
        resp.user_name = user.full_name if user else None
        response.append(resp)
    return response


@router.put("/admin/{expense_id}/review", response_model=ExpenseResponse)
async def admin_review_expense(
    expense_id: uuid.UUID,
    body: ExpenseReview,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: approve or reject an expense."""
    if body.status not in (ExpenseStatus.APPROVATO, ExpenseStatus.RIFIUTATO):
        raise HTTPException(status_code=400, detail="Status must be 'approvato' or 'rifiutato'")

    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if expense is None:
        raise HTTPException(status_code=404, detail="Nota spesa non trovata")

    old_status = expense.status.value
    expense.status = body.status
    expense.reviewed_by = admin.id
    expense.reviewed_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(expense)

    await create_audit_log(
        db, admin.id, "review_expense", "expense", str(expense_id),
        old_values={"status": old_status},
        new_values={"status": body.status.value},
        ip_address=request.client.host if request.client else None,
    )

    resp = ExpenseResponse.model_validate(expense)
    user_result = await db.execute(select(User).where(User.id == expense.user_id))
    user = user_result.scalar_one_or_none()
    resp.user_name = user.full_name if user else None
    return resp
