import io
import csv
from openpyxl import Workbook
from app.schemas.attendance import MonthlySummary


def export_to_csv(summaries: list[MonthlySummary]) -> str:
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow([
        "Dipendente", "Giorni Lavorati", "Giorni Ferie",
        "Giorni Permesso", "Giorni Non Giustificati", "Totale Ore"
    ])
    for s in summaries:
        writer.writerow([
            s.user_name,
            s.total_worked_days,
            s.total_ferie_days,
            s.total_permesso_days,
            s.total_missing_days,
            s.total_hours,
        ])
    return output.getvalue()


def export_to_excel(summaries: list[MonthlySummary]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Riepilogo Paghe"

    headers = [
        "Dipendente", "Giorni Lavorati", "Giorni Ferie",
        "Giorni Permesso", "Giorni Non Giustificati", "Totale Ore"
    ]
    ws.append(headers)

    for cell in ws[1]:
        cell.font = cell.font.copy(bold=True)

    for s in summaries:
        ws.append([
            s.user_name,
            s.total_worked_days,
            s.total_ferie_days,
            s.total_permesso_days,
            s.total_missing_days,
            s.total_hours,
        ])

    # Auto-size columns
    for col in ws.columns:
        max_length = 0
        col_letter = col[0].column_letter
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws.column_dimensions[col_letter].width = max_length + 4

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
