"""REST endpoints for in-meeting recordings (the Clips library).

Files are stored on the local filesystem at `settings.recordings_dir`. For
horizontal scaling the storage layer should move to S3 / object storage — the
schema and surface stay the same.
"""
import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.crud import meetings as crud_meetings
from app.crud import recordings as crud_recordings
from app.database import get_db
from app.schemas.recording import RecordingResponse

router = APIRouter(prefix="/api", tags=["recordings"])

_MAX_BYTES = 500 * 1024 * 1024  # 500MB hard cap
_ALLOWED_EXTS = {"webm", "mp4", "ogg"}


def _recordings_path() -> Path:
    path = Path(settings.recordings_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


@router.post(
    "/meetings/{meeting_id}/recordings",
    response_model=RecordingResponse,
    status_code=201,
)
async def upload_recording(
    meeting_id: str,
    file: UploadFile = File(...),
    title: str = Form(...),
    duration_secs: int = Form(0),
    participant_id: int | None = Form(None),
    db: Session = Depends(get_db),
):
    meeting = crud_meetings.get_meeting_by_meeting_id(db, meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    original = file.filename or ""
    ext = original.rsplit(".", 1)[-1].lower() if "." in original else "webm"
    if ext not in _ALLOWED_EXTS:
        ext = "webm"

    safe_filename = f"{meeting_id}-{uuid.uuid4().hex}.{ext}"
    dest = _recordings_path() / safe_filename

    size_bytes = 0
    try:
        with dest.open("wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size_bytes += len(chunk)
                if size_bytes > _MAX_BYTES:
                    out.close()
                    dest.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413, detail="Recording exceeds 500MB limit"
                    )
                out.write(chunk)
    except HTTPException:
        raise
    except Exception:
        dest.unlink(missing_ok=True)
        raise

    cleaned_title = (title or "").strip() or f"{meeting.title} recording"
    return crud_recordings.create_recording(
        db,
        meeting_id=meeting.id,
        title=cleaned_title[:200],
        filename=safe_filename,
        participant_id=participant_id,
        duration_secs=max(0, int(duration_secs)),
        size_bytes=size_bytes,
    )


@router.get("/recordings", response_model=list[RecordingResponse])
def list_all_recordings(db: Session = Depends(get_db)):
    return crud_recordings.list_recordings(db)


@router.get("/recordings/{recording_id}/file")
def get_recording_file(recording_id: int, db: Session = Depends(get_db)):
    rec = crud_recordings.get_recording(db, recording_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="Recording not found")
    file_path = _recordings_path() / rec.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Recording file missing")
    media_type = "video/webm" if rec.filename.endswith(".webm") else "video/mp4"
    return FileResponse(
        str(file_path), media_type=media_type, filename=rec.filename
    )


@router.delete("/recordings/{recording_id}")
def delete_recording(recording_id: int, db: Session = Depends(get_db)):
    rec = crud_recordings.get_recording(db, recording_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="Recording not found")
    (_recordings_path() / rec.filename).unlink(missing_ok=True)
    crud_recordings.delete_recording(db, rec)
    return {"message": "deleted"}
