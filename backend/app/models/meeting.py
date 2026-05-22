from datetime import datetime
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Meeting(Base):
    __tablename__ = "meetings"
    __table_args__ = (
        CheckConstraint("type IN ('instant', 'scheduled')", name="ck_meeting_type"),
        CheckConstraint("status IN ('waiting', 'active', 'ended')", name="ck_meeting_status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False, default="Instant Meeting")
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    host_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="waiting")
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duration_mins: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    invite_link: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    host: Mapped["User"] = relationship("User", back_populates="meetings")  # type: ignore
    participants: Mapped[list["Participant"]] = relationship(
        "Participant", back_populates="meeting", cascade="all, delete-orphan"
    )


class Participant(Base):
    __tablename__ = "participants"
    __table_args__ = (
        CheckConstraint("role IN ('host', 'participant')", name="ck_participant_role"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default="participant")
    is_muted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_video_off: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    left_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    meeting: Mapped[Meeting] = relationship("Meeting", back_populates="participants")
    user: Mapped["User | None"] = relationship("User", back_populates="participations")  # type: ignore
