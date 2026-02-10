from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import engine, async_session_factory, Base
from app.services.auth import ensure_admin_exists
from app.routers import auth, attendance, justification, users, export, audit, expense

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (for development; in production use Alembic)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Ensure default admin user exists
    async with async_session_factory() as session:
        await ensure_admin_exists(session)

    yield

    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(attendance.router)
app.include_router(justification.router)
app.include_router(users.router)
app.include_router(export.router)
app.include_router(audit.router)
app.include_router(expense.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": settings.APP_NAME}
