from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.meeting import (
    MeetingResponse,
    MeetingListResponse,
    CreateInstantMeetingRequest,
    CreateScheduledMeetingRequest,
    UpdateMeetingStatusRequest,
    JoinMeetingRequest,
    MuteAllRequest,
    MuteAllResponse,
    JoinMeetingResponse,
    MuteParticipantRequest,
    MuteVideoRequest,
    ParticipantResponse,
)
from app.crud import meetings as crud_meetings
from app.crud import participants as crud_participants

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


def _meeting_to_response(meeting, db) -> dict:
    return crud_meetings.enrich(meeting, db)


@router.post("/instant", response_model=JoinMeetingResponse)
def create_instant_meeting(body: CreateInstantMeetingRequest, db: Session = Depends(get_db)):
    meeting, participant = crud_meetings.create_instant_meeting(db, host_name=body.host_name)
    return {
        "meeting": _meeting_to_response(meeting, db),
        "participant": participant,
    }


@router.get("", response_model=MeetingListResponse)
def list_meetings(db: Session = Depends(get_db)):
    return crud_meetings.list_meetings(db)


@router.post("/schedule", response_model=MeetingResponse)
def schedule_meeting(body: CreateScheduledMeetingRequest, db: Session = Depends(get_db)):
    meeting = crud_meetings.create_scheduled_meeting(
        db,
        title=body.title,
        description=body.description,
        scheduled_at=body.scheduled_at,
        duration_mins=body.duration_mins,
        host_name=body.host_name,
    )
    return _meeting_to_response(meeting, db)


@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    meeting = crud_meetings.get_meeting_by_meeting_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return _meeting_to_response(meeting, db)


@router.patch("/{meeting_id}/status", response_model=MeetingResponse)
def update_status(meeting_id: str, body: UpdateMeetingStatusRequest, db: Session = Depends(get_db)):
    meeting = crud_meetings.get_meeting_by_meeting_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if body.status not in ("waiting", "active", "ended"):
        raise HTTPException(status_code=400, detail="Invalid status")
    meeting = crud_meetings.update_meeting_status(db, meeting, body.status)
    return _meeting_to_response(meeting, db)


@router.delete("/{meeting_id}")
def delete_meeting(meeting_id: str, db: Session = Depends(get_db)):
    meeting = crud_meetings.get_meeting_by_meeting_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    crud_meetings.delete_meeting(db, meeting)
    return {"message": "deleted"}


@router.post("/{meeting_id}/join", response_model=JoinMeetingResponse)
def join_meeting(meeting_id: str, body: JoinMeetingRequest, db: Session = Depends(get_db)):
    meeting = crud_meetings.get_meeting_by_meeting_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    try:
        participant = crud_participants.join_meeting(db, meeting, body.display_name, body.user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {
        "meeting": _meeting_to_response(meeting, db),
        "participant": participant,
    }


@router.get("/{meeting_id}/participants", response_model=list[ParticipantResponse])
def get_participants(meeting_id: str, db: Session = Depends(get_db)):
    meeting = crud_meetings.get_meeting_by_meeting_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return crud_participants.get_active_participants(db, meeting.id)


@router.patch("/{meeting_id}/mute-all", response_model=MuteAllResponse)
def mute_all(meeting_id: str, body: MuteAllRequest, db: Session = Depends(get_db)):
    meeting = crud_meetings.get_meeting_by_meeting_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    count = crud_participants.mute_all_participants(db, meeting.id)
    return {"updated_count": count}


@router.delete("/{meeting_id}/participants/{participant_id}")
def remove_participant(meeting_id: str, participant_id: int, db: Session = Depends(get_db)):
    meeting = crud_meetings.get_meeting_by_meeting_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    removed = crud_participants.remove_participant(db, meeting.id, participant_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Participant not found")
    return {"message": "removed"}
