from datetime import datetime
from sqlalchemy.orm import Session
from app.models.meeting import Meeting, Participant


def join_meeting(db: Session, meeting: Meeting, display_name: str, user_id: int | None = None) -> Participant:
    if meeting.status == "ended":
        raise ValueError("Meeting has ended")

    if meeting.status == "waiting":
        meeting.status = "active"
        meeting.started_at = datetime.utcnow()

    participant = Participant(
        meeting_id=meeting.id,
        user_id=user_id,
        display_name=display_name,
        role="participant",
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    db.refresh(meeting)
    return participant


def get_active_participants(db: Session, meeting_db_id: int) -> list[Participant]:
    return (
        db.query(Participant)
        .filter(Participant.meeting_id == meeting_db_id, Participant.left_at.is_(None))
        .order_by(Participant.joined_at)
        .all()
    )


def mute_participant(db: Session, participant_id: int, is_muted: bool) -> Participant | None:
    p = db.query(Participant).filter(Participant.id == participant_id).first()
    if p:
        p.is_muted = is_muted
        db.commit()
        db.refresh(p)
    return p


def set_video_off(db: Session, participant_id: int, is_video_off: bool) -> Participant | None:
    p = db.query(Participant).filter(Participant.id == participant_id).first()
    if p:
        p.is_video_off = is_video_off
        db.commit()
        db.refresh(p)
    return p


def mute_all_participants(db: Session, meeting_db_id: int) -> int:
    updated = (
        db.query(Participant)
        .filter(
            Participant.meeting_id == meeting_db_id,
            Participant.role == "participant",
            Participant.left_at.is_(None),
        )
        .all()
    )
    for p in updated:
        p.is_muted = True
    db.commit()
    return len(updated)


def remove_participant(db: Session, meeting_db_id: int, participant_id: int) -> bool:
    p = (
        db.query(Participant)
        .filter(Participant.id == participant_id, Participant.meeting_id == meeting_db_id)
        .first()
    )
    if p:
        p.left_at = datetime.utcnow()
        db.commit()
        return True
    return False


def leave_meeting(db: Session, participant_id: int) -> Participant | None:
    p = db.query(Participant).filter(Participant.id == participant_id).first()
    if p:
        p.left_at = datetime.utcnow()
        db.commit()
        db.refresh(p)
    return p
