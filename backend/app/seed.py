"""Idempotent database seed script. Run with: python -m app.seed"""
import os
import sys
import uuid
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models import meeting, user  # noqa: E402,F401
from app.models.meeting import Meeting, Participant  # noqa: E402
from app.models.user import User  # noqa: E402
from app.time_utils import utcnow  # noqa: E402


def _gen_meeting_id() -> str:
    raw = uuid.uuid4().hex
    return f"{raw[:3]}-{raw[3:7]}-{raw[7:11]}"


def _invite_link(meeting_id: str) -> str:
    return f"{settings.frontend_url}/meeting/{meeting_id}"


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("Database already seeded. Skipping.")
            return

        host = User(
            id=1,
            name=settings.default_user_name,
            email=settings.default_user_email,
        )
        db.add(host)
        db.flush()

        now = utcnow()

        upcoming = [
            {
                "title": "Weekly Team Standup",
                "description": "Daily sync with the engineering team",
                "scheduled_at": now + timedelta(hours=2),
                "duration_mins": 30,
            },
            {
                "title": "Product Roadmap Review",
                "description": "Q3 planning and feature prioritization",
                "scheduled_at": now + timedelta(days=1, hours=3),
                "duration_mins": 60,
            },
            {
                "title": "Design System Workshop",
                "description": "Review the new component library and design tokens",
                "scheduled_at": now + timedelta(days=3, hours=5),
                "duration_mins": 90,
            },
        ]
        for data in upcoming:
            mid = _gen_meeting_id()
            db.add(
                Meeting(
                    meeting_id=mid,
                    title=data["title"],
                    description=data["description"],
                    host_id=host.id,
                    type="scheduled",
                    status="waiting",
                    scheduled_at=data["scheduled_at"],
                    duration_mins=data["duration_mins"],
                    invite_link=_invite_link(mid),
                    created_at=now - timedelta(hours=1),
                )
            )

        recent = [
            {
                "title": "Q2 Retrospective",
                "description": "End of quarter retrospective meeting",
                "started_at": now - timedelta(days=1, hours=3),
                "ended_at": now - timedelta(days=1, hours=2),
                "duration_mins": 60,
                "participants": ["Alice Johnson", "Bob Martinez", "Carol Lee"],
            },
            {
                "title": "Client Demo - Acme Corp",
                "description": "Product demonstration for Acme Corp stakeholders",
                "started_at": now - timedelta(days=2, hours=5),
                "ended_at": now - timedelta(days=2, hours=4),
                "duration_mins": 45,
                "participants": ["Emma Wilson", "Frank Chen"],
            },
            {
                "title": "Engineering All-Hands",
                "description": "Monthly all-hands meeting for the engineering org",
                "started_at": now - timedelta(days=5, hours=2),
                "ended_at": now - timedelta(days=5),
                "duration_mins": 90,
                "participants": ["Grace Park", "Henry Scott", "Iris Nguyen"],
            },
        ]
        for data in recent:
            mid = _gen_meeting_id()
            m = Meeting(
                meeting_id=mid,
                title=data["title"],
                description=data["description"],
                host_id=host.id,
                type="scheduled",
                status="ended",
                scheduled_at=data["started_at"],
                duration_mins=data["duration_mins"],
                invite_link=_invite_link(mid),
                started_at=data["started_at"],
                ended_at=data["ended_at"],
                created_at=data["started_at"] - timedelta(hours=2),
            )
            db.add(m)
            db.flush()

            db.add(
                Participant(
                    meeting_id=m.id,
                    user_id=host.id,
                    display_name=host.name,
                    role="host",
                    joined_at=data["started_at"],
                    left_at=data["ended_at"],
                )
            )
            for name in data["participants"]:
                db.add(
                    Participant(
                        meeting_id=m.id,
                        display_name=name,
                        role="participant",
                        joined_at=data["started_at"] + timedelta(minutes=2),
                        left_at=data["ended_at"],
                    )
                )

        db.commit()
        print("Database seeded successfully.")
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        print(f"Seed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
