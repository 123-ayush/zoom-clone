from sqlalchemy.orm import Session

from app.models.chat_message import ChatMessage


def create_message(
    db: Session,
    meeting_id: int,
    participant_id: int | None,
    display_name: str,
    body: str,
) -> ChatMessage:
    message = ChatMessage(
        meeting_id=meeting_id,
        participant_id=participant_id,
        display_name=display_name,
        body=body,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def get_messages(db: Session, meeting_id: int, limit: int = 200) -> list[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.meeting_id == meeting_id)
        .order_by(ChatMessage.created_at, ChatMessage.id)
        .limit(limit)
        .all()
    )
