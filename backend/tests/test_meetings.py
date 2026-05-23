from datetime import timedelta

from app.time_utils import utcnow


def test_create_instant_meeting(client):
    resp = client.post("/api/meetings/instant")
    assert resp.status_code == 201
    data = resp.json()
    assert data["meeting"]["type"] == "instant"
    assert data["meeting"]["status"] == "active"
    assert data["participant"]["role"] == "host"
    assert data["meeting"]["meeting_id"]
    assert data["meeting"]["invite_link"].endswith(data["meeting"]["meeting_id"])


def test_list_meetings_empty(client):
    resp = client.get("/api/meetings")
    assert resp.status_code == 200
    assert resp.json() == {"upcoming": [], "recent": []}


def test_schedule_meeting(client):
    future = (utcnow() + timedelta(days=1)).isoformat()
    resp = client.post(
        "/api/meetings/schedule",
        json={"title": "Sprint Planning", "scheduled_at": future, "duration_mins": 45},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Sprint Planning"
    assert data["type"] == "scheduled"
    assert data["status"] == "waiting"


def test_schedule_meeting_past_date_rejected(client):
    past = (utcnow() - timedelta(days=1)).isoformat()
    resp = client.post(
        "/api/meetings/schedule",
        json={"title": "Too Late", "scheduled_at": past},
    )
    assert resp.status_code == 422


def test_schedule_meeting_blank_title_rejected(client):
    future = (utcnow() + timedelta(days=1)).isoformat()
    resp = client.post(
        "/api/meetings/schedule",
        json={"title": "   ", "scheduled_at": future},
    )
    assert resp.status_code == 422


def test_schedule_meeting_invalid_duration_rejected(client):
    future = (utcnow() + timedelta(days=1)).isoformat()
    resp = client.post(
        "/api/meetings/schedule",
        json={"title": "Marathon", "scheduled_at": future, "duration_mins": 99999},
    )
    assert resp.status_code == 422


def test_get_meeting(client):
    created = client.post("/api/meetings/instant").json()["meeting"]
    resp = client.get(f"/api/meetings/{created['meeting_id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


def test_get_meeting_not_found(client):
    resp = client.get("/api/meetings/does-not-exist")
    assert resp.status_code == 404


def test_update_status(client):
    meeting = client.post("/api/meetings/instant").json()["meeting"]
    resp = client.patch(
        f"/api/meetings/{meeting['meeting_id']}/status", json={"status": "ended"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ended"
    assert resp.json()["ended_at"] is not None


def test_update_status_invalid_rejected(client):
    meeting = client.post("/api/meetings/instant").json()["meeting"]
    resp = client.patch(
        f"/api/meetings/{meeting['meeting_id']}/status", json={"status": "paused"}
    )
    assert resp.status_code == 422


def test_delete_meeting(client):
    meeting = client.post("/api/meetings/instant").json()["meeting"]
    assert client.delete(f"/api/meetings/{meeting['meeting_id']}").status_code == 200
    assert client.get(f"/api/meetings/{meeting['meeting_id']}").status_code == 404


def test_scheduled_meeting_appears_in_upcoming(client):
    future = (utcnow() + timedelta(days=2)).isoformat()
    client.post(
        "/api/meetings/schedule",
        json={"title": "Future Meeting", "scheduled_at": future},
    )
    listing = client.get("/api/meetings").json()
    assert any(m["title"] == "Future Meeting" for m in listing["upcoming"])
    assert listing["recent"] == []


def test_instant_meeting_appears_in_upcoming(client):
    client.post("/api/meetings/instant")
    listing = client.get("/api/meetings").json()
    assert len(listing["upcoming"]) == 1
