from app.crud import chat as crud_chat


def _new_meeting(client) -> dict:
    return client.post("/api/meetings/instant").json()["meeting"]


def test_chat_history_empty(client):
    meeting = _new_meeting(client)
    resp = client.get(f"/api/meetings/{meeting['meeting_id']}/chat")
    assert resp.status_code == 200
    assert resp.json() == []


def test_chat_history_meeting_not_found(client):
    resp = client.get("/api/meetings/missing/chat")
    assert resp.status_code == 404


def test_create_and_get_messages(client, db_session):
    meeting = _new_meeting(client)
    crud_chat.create_message(db_session, meeting["id"], None, "Alice", "Hello")
    crud_chat.create_message(db_session, meeting["id"], None, "Bob", "Hi back")

    messages = crud_chat.get_messages(db_session, meeting["id"])
    assert [m.body for m in messages] == ["Hello", "Hi back"]


def test_chat_history_endpoint_returns_messages(client, db_session):
    meeting = _new_meeting(client)
    crud_chat.create_message(db_session, meeting["id"], None, "Alice", "Welcome")

    resp = client.get(f"/api/meetings/{meeting['meeting_id']}/chat")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["display_name"] == "Alice"
    assert body[0]["body"] == "Welcome"
    assert body[0]["created_at"].endswith("+00:00")
