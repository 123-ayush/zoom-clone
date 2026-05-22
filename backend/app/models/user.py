from datetime import datetime
from sqlalchemy import Integer, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False, default="Default User")
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    meetings: Mapped[list["Meeting"]] = relationship("Meeting", back_populates="host")  # type: ignore
    participations: Mapped[list["Participant"]] = relationship("Participant", back_populates="user")  # type: ignore
