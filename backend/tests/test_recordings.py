from app.crud import recordings as crud_recordings
from app.schemas.recording import RecordingResponse


def _new_meeting(client) -> dict:
    return client.post("/api/meetings/instant").json()["meeting"]


def test_create_recording(client, db_session):
    meeting = _new_meeting(client)
    rec = crud_recordings.create_recording(
        db_session,
        meeting_id=meeting["id"],
        title="Demo Recording",
        filename="demo.webm",
        duration_secs=42,
        size_bytes=1024,
    )
    assert rec.id is not None
    assert rec.status == "ready"
    assert rec.duration_secs == 42


def test_list_recordings_newest_first(client, db_session):
    meeting = _new_meeting(client)
    crud_recordings.create_recording(
        db_session, meeting["id"], "First", "first.webm"
    )
    crud_recordings.create_recording(
        db_session, meeting["id"], "Second", "second.webm"
    )
    titles = [r.title for r in crud_recordings.list_recordings(db_session)]
    assert titles == ["Second", "First"]


def test_get_recording(client, db_session):
    meeting = _new_meeting(client)
    rec = crud_recordings.create_recording(
        db_session, meeting["id"], "Demo", "demo.webm"
    )
    assert crud_recordings.get_recording(db_session, rec.id).id == rec.id


def test_get_recording_missing_returns_none(client, db_session):
    assert crud_recordings.get_recording(db_session, 9999) is None


def test_delete_recording(client, db_session):
    meeting = _new_meeting(client)
    rec = crud_recordings.create_recording(
        db_session, meeting["id"], "Demo", "demo.webm"
    )
    crud_recordings.delete_recording(db_session, rec)
    assert crud_recordings.get_recording(db_session, rec.id) is None


def test_recording_response_exposes_file_url(client, db_session):
    meeting = _new_meeting(client)
    rec = crud_recordings.create_recording(
        db_session, meeting["id"], "Demo", "demo.webm"
    )
    payload = RecordingResponse.model_validate(rec).model_dump()
    assert payload["url"] == f"/api/recordings/{rec.id}/file"
