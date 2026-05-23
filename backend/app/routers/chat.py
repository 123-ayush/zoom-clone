from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.crud import chat as crud_chat
from app.crud import meetings as crud_meetings
from app.database import get_db
from app.schemas.chat import ChatMessageResponse

router = APIRouter(prefix="/api/meetings", tags=["chat"])


@router.get("/{meeting_id}/chat", response_model=list[ChatMessageResponse])
def get_chat_history(meeting_id: str, db: Session = Depends(get_db)):
    meeting = crud_meetings.get_meeting_by_meeting_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return crud_chat.get_messages(db, meeting.id)
