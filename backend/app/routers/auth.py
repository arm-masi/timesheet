import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.config import get_settings
from app.schemas.user import LoginRequest, TokenResponse, UserResponse, ChangePasswordRequest
from app.services.auth import (
    authenticate_local_user,
    create_access_token,
    get_or_create_azure_user,
    hash_password,
    verify_password,
)
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.audit import create_audit_log

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


@router.post("/login", response_model=TokenResponse)
async def login_local(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Local admin login (non-SSO)."""
    user = await authenticate_local_user(db, body.username, body.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = create_access_token(str(user.id), user.email, user.role.value)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/azure/login")
async def azure_login():
    """Returns the Azure AD authorization URL."""
    if not settings.AZURE_CLIENT_ID or not settings.AZURE_TENANT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Azure AD not configured",
        )
    params = {
        "client_id": settings.AZURE_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": settings.AZURE_REDIRECT_URI,
        "scope": "openid profile email",
        "response_mode": "query",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return {"authorization_url": f"{settings.azure_authorize_url}?{query}"}


@router.post("/azure/callback", response_model=TokenResponse)
async def azure_callback(code: str, db: AsyncSession = Depends(get_db)):
    """Exchange Azure AD authorization code for tokens."""
    if not settings.AZURE_CLIENT_ID or not settings.AZURE_TENANT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Azure AD not configured",
        )

    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            settings.azure_token_url,
            data={
                "client_id": settings.AZURE_CLIENT_ID,
                "client_secret": settings.AZURE_CLIENT_SECRET,
                "code": code,
                "redirect_uri": settings.AZURE_REDIRECT_URI,
                "grant_type": "authorization_code",
                "scope": "openid profile email",
            },
        )

    if token_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to authenticate with Azure AD",
        )

    token_data = token_response.json()
    id_token = token_data.get("id_token")

    if not id_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No ID token received from Azure AD",
        )

    # Decode the ID token (in production, verify signature with Azure JWKS)
    from jose import jwt as jose_jwt
    claims = jose_jwt.get_unverified_claims(id_token)

    email = claims.get("preferred_username") or claims.get("email")
    name = claims.get("name", email)
    oid = claims.get("oid", "")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No email in Azure AD token",
        )

    user = await get_or_create_azure_user(db, email, name, oid)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    access_token = create_access_token(str(user.id), user.email, user.role.value)
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return UserResponse.model_validate(current_user)


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change password for local users."""
    if current_user.hashed_password is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SSO users cannot change password here",
        )

    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.hashed_password = hash_password(body.new_password)
    await db.flush()
    await create_audit_log(db, current_user.id, "change_password", "user", str(current_user.id))
    return {"message": "Password changed successfully"}
