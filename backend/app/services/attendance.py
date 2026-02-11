import uuid
import calendar
from datetime import date, time, datetime, timedelta
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.attendance import Attendance
from app.models.justification import Justification, JustificationStatus, JustificationType
from app.models.user import User, OfficeLocation
from app.schemas.attendance import DailySummary, MonthlySummary
from app.config import get_settings

settings = get_settings()


def parse_time(t: str) -> time:
    parts = t.split(":")
    return time(int(parts[0]), int(parts[1]))


WORK_START = parse_time(settings.WORK_START)
WORK_END = parse_time(settings.WORK_END)
LUNCH_START = parse_time(settings.LUNCH_START)
LUNCH_END = parse_time(settings.LUNCH_END)
FLEX_MINUTES = settings.FLEX_MINUTES
DAILY_HOURS = settings.DAILY_HOURS


def calculate_worked_hours(clock_in: time | None, clock_out: time | None) -> float:
    """Calculate worked hours, capped at 8 hours max. Lunch break is always deducted."""
    if clock_in is None or clock_out is None:
        return 0.0

    dt_in = datetime.combine(date.today(), clock_in)
    dt_out = datetime.combine(date.today(), clock_out)

    if dt_out <= dt_in:
        return 0.0

    total_minutes = (dt_out - dt_in).total_seconds() / 60

    # Deduct lunch break (1 hour) if the work spans across lunch
    lunch_s = datetime.combine(date.today(), LUNCH_START)
    lunch_e = datetime.combine(date.today(), LUNCH_END)

    if dt_in < lunch_e and dt_out > lunch_s:
        overlap_start = max(dt_in, lunch_s)
        overlap_end = min(dt_out, lunch_e)
        lunch_deduction = max(0, (overlap_end - overlap_start).total_seconds() / 60)
        total_minutes -= lunch_deduction

    hours = total_minutes / 60
    # Surplus is never counted - cap at DAILY_HOURS
    return min(hours, DAILY_HOURS)


# Italian national holidays (month, day)
NATIONAL_HOLIDAYS = [
    (1, 1),    # Capodanno
    (1, 6),    # Epifania
    (4, 25),   # Liberazione
    (5, 1),    # Festa del lavoro
    (6, 2),    # Festa della Repubblica
    (8, 15),   # Ferragosto
    (11, 1),   # Ognissanti
    (12, 8),   # Immacolata
    (12, 25),  # Natale
    (12, 26),  # Santo Stefano
]

# Patron saint holidays by office location (month, day)
PATRON_SAINT_HOLIDAYS: dict[OfficeLocation, tuple[int, int, str]] = {
    OfficeLocation.MILANO_FARA: (12, 7, "Sant'Ambrogio"),
    OfficeLocation.NAPOLI_IMMACOLATA: (9, 19, "San Gennaro"),
    OfficeLocation.NAPOLI_MASCAGNI: (9, 19, "San Gennaro"),
}


def _get_easter(year: int) -> date:
    """Compute Easter Sunday for a given year (Anonymous Gregorian algorithm)."""
    a = year % 19
    b, c = divmod(year, 100)
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


def is_national_holiday(d: date) -> bool:
    """Check if a date is an Italian national holiday (including Easter Monday)."""
    if (d.month, d.day) in NATIONAL_HOLIDAYS:
        return True
    # Pasquetta (Easter Monday)
    easter = _get_easter(d.year)
    easter_monday = easter + timedelta(days=1)
    if d == easter_monday:
        return True
    return False


def is_patron_saint_holiday(d: date, office_location: OfficeLocation | None) -> bool:
    """Check if a date is the patron saint holiday for the given office location."""
    if office_location is None:
        return False
    saint = PATRON_SAINT_HOLIDAYS.get(office_location)
    if saint is None:
        return False
    return d.month == saint[0] and d.day == saint[1]


def is_working_day(d: date, office_location: OfficeLocation | None = None) -> bool:
    """Monday=0 through Friday=4 are working days, excluding holidays."""
    if d.weekday() >= 5:
        return False
    if is_national_holiday(d):
        return False
    if is_patron_saint_holiday(d, office_location):
        return False
    return True


def validate_flex_time(clock_in: time) -> time:
    """
    Apply flex rules:
    - Max 30 min late entry allowed
    - If entering after flex window, still record it but deficit will be flagged
    """
    max_flex = datetime.combine(date.today(), WORK_START) + timedelta(minutes=FLEX_MINUTES)
    return max_flex.time()


def calculate_allowed_clock_out(clock_in: time) -> time:
    """
    Calculate the earliest allowed clock-out time based on flex:
    - If clock_in is within the flex window (09:00-09:30), can leave late accordingly
    - Work end shifts by the same delay
    """
    standard_start = datetime.combine(date.today(), WORK_START)
    actual_start = datetime.combine(date.today(), clock_in)
    flex_limit = standard_start + timedelta(minutes=FLEX_MINUTES)

    if actual_start <= flex_limit:
        delay = max(timedelta(0), actual_start - standard_start)
        adjusted_end = datetime.combine(date.today(), WORK_END) + delay
        return adjusted_end.time()
    else:
        return WORK_END


async def get_attendance_for_date(db: AsyncSession, user_id: uuid.UUID, d: date) -> Attendance | None:
    result = await db.execute(
        select(Attendance).where(and_(Attendance.user_id == user_id, Attendance.date == d))
    )
    return result.scalar_one_or_none()


async def clock_in(db: AsyncSession, user_id: uuid.UUID, notes: str | None = None) -> Attendance:
    today = date.today()
    existing = await get_attendance_for_date(db, user_id, today)
    if existing is not None and existing.clock_in is not None:
        raise ValueError("Already clocked in today")

    now = datetime.now().time().replace(microsecond=0)

    if existing is not None:
        existing.clock_in = now
        if notes:
            existing.notes = notes
        await db.flush()
        await db.refresh(existing)
        return existing

    attendance = Attendance(
        id=uuid.uuid4(),
        user_id=user_id,
        date=today,
        clock_in=now,
        notes=notes,
    )
    db.add(attendance)
    await db.flush()
    await db.refresh(attendance)
    return attendance


async def clock_out(db: AsyncSession, user_id: uuid.UUID, notes: str | None = None) -> Attendance:
    today = date.today()
    existing = await get_attendance_for_date(db, user_id, today)
    if existing is None or existing.clock_in is None:
        raise ValueError("Must clock in before clocking out")
    if existing.clock_out is not None:
        raise ValueError("Already clocked out today")

    now = datetime.now().time().replace(microsecond=0)
    existing.clock_out = now
    if notes:
        existing.notes = (existing.notes or "") + " " + notes
    await db.flush()
    await db.refresh(existing)
    return existing


async def get_monthly_summary(db: AsyncSession, user_id: uuid.UUID, year: int, month: int) -> MonthlySummary:
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise ValueError("User not found")

    _, num_days = calendar.monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, num_days)

    # Fetch all attendances for the month
    att_result = await db.execute(
        select(Attendance).where(
            and_(Attendance.user_id == user_id, Attendance.date >= start_date, Attendance.date <= end_date)
        )
    )
    attendances = {a.date: a for a in att_result.scalars().all()}

    # Fetch all justifications for the month
    just_result = await db.execute(
        select(Justification).where(
            and_(Justification.user_id == user_id, Justification.date >= start_date, Justification.date <= end_date)
        )
    )
    justifications = {j.date: j for j in just_result.scalars().all()}

    daily_details = []
    total_worked_days = 0
    total_ferie_days = 0
    total_permesso_days = 0
    total_missing_days = 0
    total_hours = 0.0

    for day_num in range(1, num_days + 1):
        d = date(year, month, day_num)
        if not is_working_day(d, user.office_location):
            continue
        if d > date.today():
            continue

        att = attendances.get(d)
        just = justifications.get(d)

        worked = 0.0
        if att and att.clock_in and att.clock_out:
            worked = calculate_worked_hours(att.clock_in, att.clock_out)
            total_worked_days += 1
            total_hours += worked

        has_justification = just is not None
        is_missing = att is None or att.clock_in is None

        if has_justification and just.status == JustificationStatus.APPROVATO:
            if just.type == JustificationType.FERIE:
                total_ferie_days += 1
                total_hours += DAILY_HOURS
            elif just.type == JustificationType.PERMESSO:
                total_permesso_days += 1
                # For partial day permesso, add remaining hours to reach 8
                if worked > 0:
                    total_hours += DAILY_HOURS - worked
                else:
                    total_hours += DAILY_HOURS

        if is_missing and not has_justification:
            total_missing_days += 1

        deficit = max(0, DAILY_HOURS - worked) if worked > 0 else 0

        daily_details.append(DailySummary(
            date=d,
            clock_in=att.clock_in if att else None,
            clock_out=att.clock_out if att else None,
            worked_hours=round(worked, 2),
            expected_hours=DAILY_HOURS,
            deficit_hours=round(deficit, 2),
            has_justification=has_justification,
            justification_type=just.type.value if just else None,
            justification_status=just.status.value if just else None,
            is_missing=is_missing and not has_justification,
        ))

    return MonthlySummary(
        year=year,
        month=month,
        user_id=user_id,
        user_name=user.full_name,
        total_worked_days=total_worked_days,
        total_ferie_days=total_ferie_days,
        total_permesso_days=total_permesso_days,
        total_missing_days=total_missing_days,
        total_hours=round(total_hours, 2),
        daily_details=daily_details,
    )
