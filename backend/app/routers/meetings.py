from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.crud import meetings as crud_meetings
from app.crud import participants as crud_participants
from app.database import get_db
from app.ws.manager import room_manager
from app.schemas.meeting import (
    CreateInstantMeetingRequest,
    CreateScheduledMeetingRequest,
    JoinMeetingRequest,
    JoinMeetingResponse,
    MeetingListResponse,
    MeetingResponse,
    MuteAllRequest,
    MuteAllResponse,
    ParticipantResponse,
    UpdateMeetingStatusRequest,
)

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


def _get_meeting_or_404(db: Session, meeting_id: str):
    meeting = crud_meetings.get_meeting_by_meeting_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.post("/instant", response_model=JoinMeetingResponse, status_code=201)
def create_instant_meeting(
    body: CreateInstantMeetingRequest | None = None,
    db: Session = Depends(get_db),
):
    meeting, participant = crud_meetings.create_instant_meeting(
        db, display_name=body.display_name if body else None
    )
    return {"meeting": crud_meetings.enrich(meeting, db), "participant": participant}


@router.get("", response_model=MeetingListResponse)
def list_meetings(db: Session = Depends(get_db)):
    return crud_meetings.list_meetings(db)


@router.post("/schedule", response_model=MeetingResponse, status_code=201)
def schedule_meeting(
    body: CreateScheduledMeetingRequest, db: Session = Depends(get_db)
):
    meeting = crud_meetings.create_scheduled_meeting(
        db,
        title=body.title,
        description=body.description,
        scheduled_at=body.scheduled_at,
        duration_mins=body.duration_mins,
    )
    return crud_meetings.enrich(meeting, db)


@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    return crud_meetings.enrich(_get_meeting_or_404(db, meeting_id), db)


@router.patch("/{meeting_id}/status", response_model=MeetingResponse)
async def update_status(
    meeting_id: str,
    body: UpdateMeetingStatusRequest,
    db: Session = Depends(get_db),
):
    meeting = _get_meeting_or_404(db, meeting_id)
    meeting = crud_meetings.update_meeting_status(db, meeting, body.status)
    if body.status == "ended":
        await room_manager.broadcast(
            meeting_id,
            {"type": "meeting-ended", "payload": {"meetingId": meeting_id}},
        )
    return crud_meetings.enrich(meeting, db)


@router.delete("/{meeting_id}")
async def delete_meeting(meeting_id: str, db: Session = Depends(get_db)):
    meeting = _get_meeting_or_404(db, meeting_id)
    await room_manager.broadcast(
        meeting_id,
        {"type": "meeting-ended", "payload": {"meetingId": meeting_id}},
    )
    crud_meetings.delete_meeting(db, meeting)
    return {"message": "deleted"}


@router.post("/{meeting_id}/join", response_model=JoinMeetingResponse)
def join_meeting(
    meeting_id: str, body: JoinMeetingRequest, db: Session = Depends(get_db)
):
    meeting = _get_meeting_or_404(db, meeting_id)
    try:
        participant = crud_participants.join_meeting(db, meeting, body.display_name)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    return {"meeting": crud_meetings.enrich(meeting, db), "participant": participant}


@router.get("/{meeting_id}/participants", response_model=list[ParticipantResponse])
def get_participants(meeting_id: str, db: Session = Depends(get_db)):
    meeting = _get_meeting_or_404(db, meeting_id)
    return crud_participants.get_active_participants(db, meeting.id)


@router.patch("/{meeting_id}/mute-all", response_model=MuteAllResponse)
def mute_all(
    meeting_id: str, body: MuteAllRequest, db: Session = Depends(get_db)
):
    meeting = _get_meeting_or_404(db, meeting_id)
    count = crud_participants.mute_all_participants(db, meeting.id)
    return {"updated_count": count}


@router.delete("/{meeting_id}/participants/{participant_id}")
async def remove_participant(
    meeting_id: str, participant_id: int, db: Session = Depends(get_db)
):
    meeting = _get_meeting_or_404(db, meeting_id)
    if not crud_participants.remove_participant(db, meeting.id, participant_id):
        raise HTTPException(status_code=404, detail="Participant not found")
    # Notify and disconnect the removed peer's WebSocket if one is open.
    await room_manager.send_to(
        meeting_id, participant_id, {"type": "removed", "payload": {}}
    )
    target_ws = room_manager.get_socket(meeting_id, participant_id)
    if target_ws is not None:
        try:
            await target_ws.close(code=4003, reason="Removed by host")
        except Exception:
            pass
    return {"message": "removed"}
