import uuid
import os
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user, require_admin
from app.models.user import User, UserRole
from app.models.expense import ExpenseReport, ExpenseItem, ExpenseStatus, ExpenseType
from app.schemas.expense import ExpenseReportCreate, ExpenseReportResponse, ExpenseReview, ExpenseItemCreate
from app.services.audit import create_audit_log

router = APIRouter(prefix="/api/expenses", tags=["expenses"])

UPLOAD_DIR = "/app/uploads/receipts"


def _ensure_upload_dir():
    os.makedirs(UPLOAD_DIR, exist_ok=True)


def _build_response(report: ExpenseReport, user_name: str | None = None) -> ExpenseReportResponse:
    resp = ExpenseReportResponse.model_validate(report)
    resp.user_name = user_name
    return resp


@router.post("/", response_model=ExpenseReportResponse, status_code=status.HTTP_201_CREATED)
async def create_expense_report(
    data: str = Form(...),
    receipt: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Employee: create an expense report with multiple items. Data is JSON in form field."""
    try:
        parsed = json.loads(data)
        body = ExpenseReportCreate(**parsed)
    except (json.JSONDecodeError, Exception) as e:
        raise HTTPException(status_code=400, detail=f"Dati non validi: {str(e)}")

    if body.date_to < body.date_from:
        raise HTTPException(status_code=400, detail="La data fine deve essere >= data inizio")

    # Validate & save receipt PDF
    receipt_filename = None
    receipt_path = None
    if receipt is not None:
        if not receipt.filename or not receipt.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Solo file PDF sono accettati come scontrini")
        _ensure_upload_dir()
        file_id = str(uuid.uuid4())
        receipt_filename = receipt.filename
        receipt_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")
        content = await receipt.read()
        with open(receipt_path, "wb") as f:
            f.write(content)

    # Calculate totals and create items
    total_expenses = 0.0
    total_km = 0.0
    items = []

    for item_data in body.items:
        km_total = None
        if item_data.km is not None and item_data.cost_per_km is not None:
            km_total = round(item_data.km * item_data.cost_per_km, 2)
            total_km += km_total

        total_expenses += round(item_data.amount, 2)

        items.append(ExpenseItem(
            id=uuid.uuid4(),
            expense_type=item_data.expense_type,
            description=item_data.description,
            amount=round(item_data.amount, 2),
            km=item_data.km,
            cost_per_km=item_data.cost_per_km,
            km_total=km_total,
        ))

    grand_total = round(total_expenses + total_km, 2)

    report = ExpenseReport(
        id=uuid.uuid4(),
        user_id=current_user.id,
        date_from=body.date_from,
        date_to=body.date_to,
        description=body.description,
        total_expenses=round(total_expenses, 2),
        total_km_reimbursement=round(total_km, 2),
        grand_total=grand_total,
        receipt_filename=receipt_filename,
        receipt_path=receipt_path,
        status=ExpenseStatus.IN_ATTESA,
        items=items,
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)

    await create_audit_log(
        db, current_user.id, "create_expense_report", "expense_report", str(report.id),
        new_values={"items": len(items), "total": grand_total},
    )

    return _build_response(report, current_user.full_name)


@router.get("/my", response_model=list[ExpenseReportResponse])
async def get_my_expenses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Employee: get own expense reports."""
    result = await db.execute(
        select(ExpenseReport)
        .where(ExpenseReport.user_id == current_user.id)
        .order_by(ExpenseReport.created_at.desc())
    )
    reports = result.scalars().all()
    return [_build_response(r, current_user.full_name) for r in reports]


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Employee: delete own pending expense report."""
    result = await db.execute(
        select(ExpenseReport).where(
            and_(ExpenseReport.id == report_id, ExpenseReport.user_id == current_user.id)
        )
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="Nota spesa non trovata")
    if report.status != ExpenseStatus.IN_ATTESA:
        raise HTTPException(status_code=400, detail="Non puoi eliminare una nota spesa gia' revisionata")

    if report.receipt_path and os.path.exists(report.receipt_path):
        os.remove(report.receipt_path)

    await db.delete(report)
    await db.flush()


@router.get("/receipt/{report_id}")
async def download_receipt(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download a receipt PDF."""
    result = await db.execute(select(ExpenseReport).where(ExpenseReport.id == report_id))
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="Nota spesa non trovata")

    if current_user.role != UserRole.ADMIN and report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Non autorizzato")

    if not report.receipt_path or not os.path.exists(report.receipt_path):
        raise HTTPException(status_code=404, detail="Scontrino non trovato")

    from fastapi.responses import FileResponse
    return FileResponse(
        report.receipt_path,
        media_type="application/pdf",
        filename=report.receipt_filename or "scontrino.pdf",
    )


# ---- Admin ----

@router.get("/admin/all", response_model=list[ExpenseReportResponse])
async def admin_get_all_expenses(
    status_filter: ExpenseStatus | None = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: get all expense reports."""
    query = select(ExpenseReport)
    if status_filter:
        query = query.where(ExpenseReport.status == status_filter)
    query = query.order_by(ExpenseReport.created_at.desc())

    result = await db.execute(query)
    reports = result.scalars().all()

    response = []
    for r in reports:
        user_result = await db.execute(select(User).where(User.id == r.user_id))
        user = user_result.scalar_one_or_none()
        response.append(_build_response(r, user.full_name if user else None))
    return response


@router.put("/admin/{report_id}/review", response_model=ExpenseReportResponse)
async def admin_review_expense(
    report_id: uuid.UUID,
    body: ExpenseReview,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: approve or reject an expense report."""
    if body.status not in (ExpenseStatus.APPROVATO, ExpenseStatus.RIFIUTATO):
        raise HTTPException(status_code=400, detail="Stato deve essere 'approvato' o 'rifiutato'")

    result = await db.execute(select(ExpenseReport).where(ExpenseReport.id == report_id))
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="Nota spesa non trovata")

    old_status = report.status.value
    report.status = body.status
    report.reviewed_by = admin.id
    report.reviewed_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(report)

    await create_audit_log(
        db, admin.id, "review_expense", "expense_report", str(report_id),
        old_values={"status": old_status},
        new_values={"status": body.status.value},
        ip_address=request.client.host if request.client else None,
    )

    user_result = await db.execute(select(User).where(User.id == report.user_id))
    user = user_result.scalar_one_or_none()
    return _build_response(report, user.full_name if user else None)
