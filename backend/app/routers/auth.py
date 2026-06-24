"""Auth router — login endpoint untuk mendapatkan JWT token."""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.auth import verify_admin, create_access_token

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    """Login admin, dapatkan JWT access token."""
    if not verify_admin(body.username, body.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah",
        )

    token = create_access_token(data={"sub": body.username})
    return LoginResponse(
        access_token=token,
        username=body.username,
    )


@router.get("/me")
def me():
    """Check token validity (dilindungi middleware di main.py)."""
    return {"status": "authenticated"}
