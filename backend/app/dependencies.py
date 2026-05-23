"""Shared helpers for resolving the implicit current user."""
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User

DEFAULT_USER_ID = 1


def get_current_user(db: Session) -> User:
    """Return the single implicit user.

    The assignment specifies no authentication, so the whole app operates as one
    logged-in user. The row is created on first use if the database is empty.
    """
    user = db.get(User, DEFAULT_USER_ID)
    if user is None:
        user = User(
            id=DEFAULT_USER_ID,
            name=settings.default_user_name,
            email=settings.default_user_email,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
