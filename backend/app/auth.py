"""JWT Authentication untuk Vidflow Studio Dashboard."""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

# Config
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "vidflow-studio-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Admin credentials (hardcoded single-admin)
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD_HASH = None  # Akan di-set saat startup

security = HTTPBearer()


def init_admin_password():
    """Hash password admin dari environment variable saat startup."""
    global ADMIN_PASSWORD_HASH
    raw_password = os.getenv("ADMIN_PASSWORD", "admin")
    ADMIN_PASSWORD_HASH = bcrypt.hashpw(
        raw_password.encode("utf-8"),
        bcrypt.gensalt()
    )


def verify_admin(username: str, password: str) -> bool:
    """Verifikasi kredensial admin."""
    if username != ADMIN_USERNAME:
        return False
    return bcrypt.checkpw(
        password.encode("utf-8"),
        ADMIN_PASSWORD_HASH
    )


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Buat JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency: verifikasi JWT token dari Authorization header."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None or username != ADMIN_USERNAME:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        return {"username": username}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
