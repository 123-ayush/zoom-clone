from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.meeting import ParticipantResponse, MuteParticipantRequest, MuteVideoRequest
from app.crud import participants as crud_participants

router = APIRouter(prefix="/api/participants", tags=["participants"])


@router.patch("/{participant_id}/mute", response_model=ParticipantResponse)
def mute_participant(participant_id: int, body: MuteParticipantRequest, db: Session = Depends(get_db)):
    p = crud_participants.mute_participant(db, participant_id, body.is_muted)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    return p


@router.patch("/{participant_id}/video", response_model=ParticipantResponse)
def toggle_video(participant_id: int, body: MuteVideoRequest, db: Session = Depends(get_db)):
    p = crud_participants.set_video_off(db, participant_id, body.is_video_off)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    return p


@router.patch("/{participant_id}/leave", response_model=ParticipantResponse)
def leave(participant_id: int, db: Session = Depends(get_db)):
    p = crud_participants.leave_meeting(db, participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    return p
