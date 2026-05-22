import uuid
import os
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.meeting import Meeting, Participant
from app.models.user import User


def _generate_meeting_id() -> str:
    raw = uuid.uuid4().hex
    return f"{raw[:3]}-{raw[3:7]}-{raw[7:11]}"


def _build_invite_link(meeting_id: str) -> str:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return f"{frontend_url}/meeting/{meeting_id}"


def _participant_count(db: Session, meeting_db_id: int) -> int:
    return db.query(func.count(Participant.id)).filter(
        Participant.meeting_id == meeting_db_id,
        Participant.left_at.is_(None),
    ).scalar() or 0


def enrich(meeting: Meeting, db: Session) -> dict:
    data = {c.name: getattr(meeting, c.name) for c in meeting.__table__.columns}
    data["participant_count"] = _participant_count(db, meeting.id)
    return data


def get_or_create_default_user(db: Session) -> User:
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        user = User(name="Default User", email="user@zoom-clone.dev")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def create_instant_meeting(db: Session, host_name: str = "Default User") -> tuple[Meeting, Participant]:
    host = get_or_create_default_user(db)
    meeting_id = _generate_meeting_id()
    meeting = Meeting(
        meeting_id=meeting_id,
        title="Instant Meeting",
        host_id=host.id,
        type="instant",
        status="active",
        duration_mins=60,
        invite_link=_build_invite_link(meeting_id),
        started_at=datetime.utcnow(),
    )
    db.add(meeting)
    db.flush()
    participant = Participant(
        meeting_id=meeting.id,
        user_id=host.id,
        display_name=host_name,
        role="host",
    )
    db.add(participant)
    db.commit()
    db.refresh(meeting)
    db.refresh(participant)
    return meeting, participant


def create_scheduled_meeting(
    db: Session,
    title: str,
    scheduled_at: datetime,
    duration_mins: int = 60,
    description: str | None = None,
    host_name: str = "Default User",
) -> Meeting:
    host = get_or_create_default_user(db)
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
    return meeting


def get_meeting_by_meeting_id(db: Session, meeting_id: str) -> Meeting | None:
    return db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()


def list_meetings(db: Session, status_filter: str = "all") -> dict:
    now = datetime.utcnow()
    all_meetings = db.query(Meeting).order_by(Meeting.created_at.desc()).all()

    upcoming = []
    recent = []
    for m in all_meetings:
        count = _participant_count(db, m.id)
        m_dict = {c.name: getattr(m, c.name) for c in m.__table__.columns}
        m_dict["participant_count"] = count

        if m.status in ("waiting", "active") and (m.type == "instant" or (m.scheduled_at and m.scheduled_at >= now)):
            upcoming.append(m_dict)
        else:
            recent.append(m_dict)

    return {"upcoming": upcoming, "recent": recent}


def update_meeting_status(db: Session, meeting: Meeting, status: str) -> Meeting:
    meeting.status = status
    if status == "active" and not meeting.started_at:
        meeting.started_at = datetime.utcnow()
    if status == "ended":
        meeting.ended_at = datetime.utcnow()
    db.commit()
    db.refresh(meeting)
    return meeting


def delete_meeting(db: Session, meeting: Meeting) -> None:
    db.delete(meeting)
    db.commit()
