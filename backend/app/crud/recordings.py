import logging

from sqlalchemy.orm import Session

from app.models.recording import Recording

logger = logging.getLogger(__name__)


def create_recording(
    db: Session,
    meeting_id: int,
    title: str,
    filename: str,
    participant_id: int | None = None,
    duration_secs: int = 0,
    size_bytes: int = 0,
) -> Recording:
    recording = Recording(
        meeting_id=meeting_id,
        created_by_participant_id=participant_id,
        title=title,
        filename=filename,
        duration_secs=duration_secs,
        size_bytes=size_bytes,
        status="ready",
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)
    logger.info("Stored recording '%s' for meeting #%d", filename, meeting_id)
    return recording


def list_recordings(db: Session) -> list[Recording]:
    return db.query(Recording).order_by(Recording.created_at.desc()).all()


def get_recording(db: Session, recording_id: int) -> Recording | None:
    return db.get(Recording, recording_id)


def delete_recording(db: Session, recording: Recording) -> None:
    db.delete(recording)
    db.commit()
