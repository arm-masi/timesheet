from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import io
from app.database import get_db
from app.middleware.auth import require_admin
from app.models.user import User
from app.services.attendance import get_monthly_summary
from app.services.export import export_to_csv, export_to_excel

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/payroll")
async def export_payroll(
    year: int = Query(...),
    month: int = Query(...),
    format: str = Query("csv", regex="^(csv|excel)$"),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: export monthly payroll data."""
    result = await db.execute(select(User).where(User.is_active == True).order_by(User.full_name))
    users = result.scalars().all()

    summaries = []
    for user in users:
        summary = await get_monthly_summary(db, user.id, year, month)
        summaries.append(summary)

    if format == "csv":
        csv_data = export_to_csv(summaries)
        return StreamingResponse(
            io.StringIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=paghe_{year}_{month:02d}.csv"},
        )
    else:
        excel_data = export_to_excel(summaries)
        return StreamingResponse(
            io.BytesIO(excel_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=paghe_{year}_{month:02d}.xlsx"},
        )
