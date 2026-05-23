import logging

from sqlalchemy.orm import Session

from app.models.meeting import Meeting, Participant
from app.time_utils import utcnow

logger = logging.getLogger(__name__)


def get_participant(db: Session, participant_id: int) -> Participant | None:
    return db.get(Participant, participant_id)


def join_meeting(
    db: Session, meeting: Meeting, display_name: str, role: str = "participant"
) -> Participant:
    if meeting.status == "ended":
        raise ValueError("This meeting has ended")

    if meeting.status == "waiting":
        meeting.status = "active"
        meeting.started_at = utcnow()

    participant = Participant(
        meeting_id=meeting.id,
        display_name=display_name,
        role=role,
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    db.refresh(meeting)
    logger.info("%s joined meeting %s", display_name, meeting.meeting_id)
    return participant


def get_active_participants(db: Session, meeting_db_id: int) -> list[Participant]:
    return (
        db.query(Participant)
        .filter(Participant.meeting_id == meeting_db_id, Participant.left_at.is_(None))
        .order_by(Participant.joined_at)
        .all()
    )


def mute_participant(
    db: Session, participant_id: int, is_muted: bool
) -> Participant | None:
    p = db.get(Participant, participant_id)
    if p:
        p.is_muted = is_muted
        db.commit()
        db.refresh(p)
    return p


def set_video_off(
    db: Session, participant_id: int, is_video_off: bool
) -> Participant | None:
    p = db.get(Participant, participant_id)
    if p:
        p.is_video_off = is_video_off
        db.commit()
        db.refresh(p)
    return p


def mute_all_participants(db: Session, meeting_db_id: int) -> int:
    targets = (
        db.query(Participant)
        .filter(
            Participant.meeting_id == meeting_db_id,
            Participant.role == "participant",
            Participant.left_at.is_(None),
        )
        .all()
    )
    for p in targets:
        p.is_muted = True
    db.commit()
    logger.info("Muted %d participants in meeting #%d", len(targets), meeting_db_id)
    return len(targets)


def remove_participant(db: Session, meeting_db_id: int, participant_id: int) -> bool:
    p = (
        db.query(Participant)
        .filter(
            Participant.id == participant_id,
            Participant.meeting_id == meeting_db_id,
        )
        .first()
    )
    if p and p.left_at is None:
        p.left_at = utcnow()
        db.commit()
        return True
    return p is not None


def rename_participant(
    db: Session, participant_id: int, display_name: str
) -> Participant | None:
    p = db.get(Participant, participant_id)
    if p:
        p.display_name = display_name
        db.commit()
        db.refresh(p)
    return p


def leave_meeting(db: Session, participant_id: int) -> Participant | None:
    p = db.get(Participant, participant_id)
    if p and p.left_at is None:
        p.left_at = utcnow()
        db.commit()
        db.refresh(p)
    return p
