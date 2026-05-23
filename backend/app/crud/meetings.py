import logging
import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.dependencies import get_current_user
from app.models.meeting import Meeting, Participant
from app.time_utils import ensure_aware, utcnow

logger = logging.getLogger(__name__)


def _generate_meeting_id() -> str:
    raw = uuid.uuid4().hex
    return f"{raw[:3]}-{raw[3:7]}-{raw[7:11]}"


def _build_invite_link(meeting_id: str) -> str:
    return f"{settings.frontend_url}/meeting/{meeting_id}"


def _participant_count(db: Session, meeting_db_id: int) -> int:
    return (
        db.query(func.count(Participant.id))
        .filter(Participant.meeting_id == meeting_db_id)
        .scalar()
        or 0
    )


def enrich(meeting: Meeting, db: Session) -> dict:
    """Serialize a meeting plus its participant count for API responses."""
    data = {c.name: getattr(meeting, c.name) for c in meeting.__table__.columns}
    data["participant_count"] = _participant_count(db, meeting.id)
    return data


def get_meeting_by_meeting_id(db: Session, meeting_id: str) -> Meeting | None:
    return db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()


def create_instant_meeting(
    db: Session, display_name: str | None = None
) -> tuple[Meeting, Participant]:
    host = get_current_user(db)
    host_display = display_name or host.name
    meeting_id = _generate_meeting_id()
    meeting = Meeting(
        meeting_id=meeting_id,
        title=f"{host_display}'s Meeting",
        host_id=host.id,
        type="instant",
        status="active",
        duration_mins=60,
        invite_link=_build_invite_link(meeting_id),
        started_at=utcnow(),
    )
    db.add(meeting)
    db.flush()
    participant = Participant(
        meeting_id=meeting.id,
        user_id=host.id,
        display_name=host_display,
        role="host",
    )
    db.add(participant)
    db.commit()
    db.refresh(meeting)
    db.refresh(participant)
    logger.info("Created instant meeting %s", meeting_id)
    return meeting, participant


def create_scheduled_meeting(
    db: Session,
    title: str,
    scheduled_at,
    duration_mins: int = 60,
    description: str | None = None,
) -> Meeting:
    host = get_current_user(db)
    meeting_id = _generate_meeting_id()
    meeting = Meeting(
        meeting_id=meeting_id,
        title=title,
        description=description,
        host_id=host.id,
        type="scheduled",
        status="waiting",
        scheduled_at=scheduled_at,
        duration_mins=duration_mins,
        invite_link=_build_invite_link(meeting_id),
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    logger.info("Created scheduled meeting %s", meeting_id)
    return meeting


def list_meetings(db: Session) -> dict:
    now = utcnow()
    all_meetings = db.query(Meeting).order_by(Meeting.created_at.desc()).all()

    upcoming: list[dict] = []
    recent: list[dict] = []
    for m in all_meetings:
        scheduled = ensure_aware(m.scheduled_at)
        is_upcoming = m.status in ("waiting", "active") and (
            m.type == "instant" or (scheduled is not None and scheduled >= now)
        )
        (upcoming if is_upcoming else recent).append(enrich(m, db))

    return {"upcoming": upcoming, "recent": recent}


def update_meeting_status(db: Session, meeting: Meeting, status: str) -> Meeting:
    meeting.status = status
    if status == "active" and not meeting.started_at:
        meeting.started_at = utcnow()
    if status == "ended" and not meeting.ended_at:
        meeting.ended_at = utcnow()
    db.commit()
    db.refresh(meeting)
    logger.info("Meeting %s status -> %s", meeting.meeting_id, status)
    return meeting


def delete_meeting(db: Session, meeting: Meeting) -> None:
    logger.info("Deleting meeting %s", meeting.meeting_id)
    db.delete(meeting)
    db.commit()
