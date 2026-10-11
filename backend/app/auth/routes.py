# app/auth/routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime
import secrets
import string

from app.database.database import get_db
from app.models.models import User
from app.auth.jwt_handler import create_access_token, verify_password, get_password_hash
from app.auth.dependencies import get_current_user

router = APIRouter()


def _generate_temp_password(length: int = 10) -> str:
    chars = string.ascii_letters + string.digits + "!@#$"
    return ''.join(secrets.choice(chars) for _ in range(length))


# ── Login ──────────────────────────────────────────────────────────────────────
@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")

    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token({"sub": user.email, "role": user.role, "name": user.name})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id":                  user.id,
            "name":                user.name,
            "email":               user.email,
            "role":                user.role,
            "department":          user.department,
            "must_change_password": getattr(user, 'must_change_password', False),
        }
    }


# ── Logout ─────────────────────────────────────────────────────────────────────
@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out successfully"}


# ── Me ─────────────────────────────────────────────────────────────────────────
@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id":         current_user.id,
        "name":       current_user.name,
        "email":      current_user.email,
        "role":       current_user.role,
        "department": current_user.department,
        "is_active":  current_user.is_active,
        "must_change_password": getattr(current_user, 'must_change_password', False),
    }


# ── Register (public signup) ────────────────────────────────────────────────────
@router.post("/register")
def register(data: dict, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data["email"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=data["name"],
        email=data["email"],
        employee_id=data.get("employee_id"),
        role=data.get("role", "operator"),
        department=data.get("department"),
        hashed_password=get_password_hash(data["password"]),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Account created successfully", "email": user.email}


# ── Invite User (admin only) ────────────────────────────────────────────────────
@router.post("/invite")
def invite_user(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only admin can invite
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can invite new users")

    existing = db.query(User).filter(User.email == data["email"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    temp_password = _generate_temp_password()

    user = User(
        name=data["name"],
        email=data["email"],
        employee_id=data.get("employee_id", ""),
        role=data.get("role", "operator"),
        department=data.get("department", ""),
        hashed_password=get_password_hash(temp_password),
        is_active=True,
        must_change_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Send invite email
    try:
        from app.alerts.email_sender import send_invite_email
        send_invite_email(
            name=user.name,
            email=user.email,
            role=user.role,
            temp_password=temp_password,
        )
    except Exception as e:
        print(f"Invite email failed: {e}")

    return {
        "message": f"User {user.name} invited successfully. Credentials sent to {user.email}.",
        "user": {
            "id":         user.id,
            "name":       user.name,
            "email":      user.email,
            "role":       user.role,
            "department": user.department,
        }
    }


# ── List Users ─────────────────────────────────────────────────────────────────
@router.get("/users")
def list_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    users = db.query(User).order_by(User.created_at).all()
    return [
        {
            "id":         u.id,
            "name":       u.name,
            "email":      u.email,
            "role":       u.role,
            "department": u.department,
            "is_active":  u.is_active,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "must_change_password": getattr(u, 'must_change_password', False),
        }
        for u in users
    ]


# ── Delete User ────────────────────────────────────────────────────────────────
@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": f"User {user.name} deleted"}


# ── Toggle User Active ─────────────────────────────────────────────────────────
@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update users")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if "is_active" in data:
        user.is_active = data["is_active"]
    if "role" in data:
        user.role = data["role"]
    if "department" in data:
        user.department = data["department"]
    db.commit()
    return {"message": "User updated", "id": user.id}


# ── Change Password ────────────────────────────────────────────────────────────
@router.post("/change-password")
def change_password(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify current password
    if not verify_password(data["current_password"], current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(data["new_password"]) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    current_user.hashed_password    = get_password_hash(data["new_password"])
    current_user.must_change_password = False
    db.commit()
    return {"message": "Password changed successfully"}
