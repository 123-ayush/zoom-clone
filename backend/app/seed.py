"""Idempotent seed script. Run with: python -m app.seed"""
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.database import engine, SessionLocal, Base
from app.models import user, meeting  # noqa: F401
from app.models.user import User
from app.models.meeting import Meeting, Participant
import uuid


def gen_meeting_id() -> str:
    raw = uuid.uuid4().hex
    return f"{raw[:3]}-{raw[3:7]}-{raw[7:11]}"


def build_invite_link(meeting_id: str) -> str:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return f"{frontend_url}/meeting/{meeting_id}"


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("Database already seeded. Skipping.")
            return

        # Default user
        default_user = User(
            id=1,
            name="Default User",
            email="user@zoom-clone.dev",
        )
        db.add(default_user)
        db.flush()

        now = datetime.utcnow()

        # 3 upcoming scheduled meetings
        upcoming_data = [
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
                "description": "Review new component library and design tokens",
                "scheduled_at": now + timedelta(days=3, hours=5),
                "duration_mins": 90,
            },
        ]

        for data in upcoming_data:
            mid = gen_meeting_id()
            m = Meeting(
                meeting_id=mid,
                title=data["title"],
                description=data["description"],
                host_id=1,
                type="scheduled",
                status="waiting",
                scheduled_at=data["scheduled_at"],
                duration_mins=data["duration_mins"],
                invite_link=build_invite_link(mid),
                created_at=now - timedelta(hours=1),
            )
            db.add(m)
            db.flush()

        # 4 recent/ended meetings with participants
        recent_data = [
            {
                "title": "Q2 Retrospective",
                "description": "End of quarter retrospective meeting",
                "started_at": now - timedelta(days=1, hours=3),
                "ended_at": now - timedelta(days=1, hours=2),
                "duration_mins": 60,
                "participants": ["Alice Johnson", "Bob Martinez", "Carol Lee", "David Kim"],
            },
            {
                "title": "Client Demo — Acme Corp",
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
                "participants": ["Grace Park", "Henry Scott", "Iris Nguyen", "James Liu", "Kate Brown"],
            },
            {
                "title": "Onboarding — New Engineers",
                "description": "Onboarding session for the new engineering hires",
                "started_at": now - timedelta(days=7, hours=4),
                "ended_at": now - timedelta(days=7, hours=3),
                "duration_mins": 60,
                "participants": ["Liam Chen", "Maya Patel"],
            },
        ]

        for data in recent_data:
            mid = gen_meeting_id()
            m = Meeting(
                meeting_id=mid,
                title=data["title"],
                description=data["description"],
                host_id=1,
                type="scheduled",
                status="ended",
                scheduled_at=data["started_at"],
                duration_mins=data["duration_mins"],
                invite_link=build_invite_link(mid),
                started_at=data["started_at"],
                ended_at=data["ended_at"],
                created_at=data["started_at"] - timedelta(hours=2),
            )
            db.add(m)
            db.flush()

            # Host participant
            db.add(Participant(
                meeting_id=m.id,
                user_id=1,
                display_name="Default User",
                role="host",
                joined_at=data["started_at"],
                left_at=data["ended_at"],
            ))

            for name in data["participants"]:
                db.add(Participant(
                    meeting_id=m.id,
                    user_id=None,
                    display_name=name,
                    role="participant",
                    joined_at=data["started_at"] + timedelta(minutes=2),
                    left_at=data["ended_at"],
                ))

        db.commit()
        print("Database seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
