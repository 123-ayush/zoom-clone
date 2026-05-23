def _new_meeting(client) -> dict:
    return client.post("/api/meetings/instant").json()["meeting"]


def test_join_meeting(client):
    meeting = _new_meeting(client)
    resp = client.post(
        f"/api/meetings/{meeting['meeting_id']}/join",
        json={"display_name": "Alice"},
    )
    assert resp.status_code == 200
    assert resp.json()["participant"]["display_name"] == "Alice"
    assert resp.json()["participant"]["role"] == "participant"


def test_join_meeting_not_found(client):
    resp = client.post(
        "/api/meetings/missing/join", json={"display_name": "Alice"}
    )
    assert resp.status_code == 404


def test_join_ended_meeting_rejected(client):
    meeting = _new_meeting(client)
    client.patch(
        f"/api/meetings/{meeting['meeting_id']}/status", json={"status": "ended"}
    )
    resp = client.post(
        f"/api/meetings/{meeting['meeting_id']}/join",
        json={"display_name": "Alice"},
    )
    assert resp.status_code == 409


def test_join_blank_name_rejected(client):
    meeting = _new_meeting(client)
    resp = client.post(
        f"/api/meetings/{meeting['meeting_id']}/join",
        json={"display_name": "   "},
    )
    assert resp.status_code == 422


def test_get_participants(client):
    meeting = _new_meeting(client)
    client.post(
        f"/api/meetings/{meeting['meeting_id']}/join",
        json={"display_name": "Alice"},
    )
    resp = client.get(f"/api/meetings/{meeting['meeting_id']}/participants")
    assert resp.status_code == 200
    assert len(resp.json()) == 2  # host + Alice


def test_mute_participant(client):
    meeting = _new_meeting(client)
    pid = client.post(
        f"/api/meetings/{meeting['meeting_id']}/join",
        json={"display_name": "Alice"},
    ).json()["participant"]["id"]
    resp = client.patch(f"/api/participants/{pid}/mute", json={"is_muted": True})
    assert resp.status_code == 200
    assert resp.json()["is_muted"] is True


def test_mute_participant_not_found(client):
    resp = client.patch("/api/participants/9999/mute", json={"is_muted": True})
    assert resp.status_code == 404


def test_toggle_video(client):
    meeting = _new_meeting(client)
    pid = client.post(
        f"/api/meetings/{meeting['meeting_id']}/join",
        json={"display_name": "Alice"},
    ).json()["participant"]["id"]
    resp = client.patch(f"/api/participants/{pid}/video", json={"is_video_off": True})
    assert resp.status_code == 200
    assert resp.json()["is_video_off"] is True


def test_leave_participant(client):
    meeting = _new_meeting(client)
    pid = client.post(
        f"/api/meetings/{meeting['meeting_id']}/join",
        json={"display_name": "Alice"},
    ).json()["participant"]["id"]
    assert client.patch(f"/api/participants/{pid}/leave").status_code == 200
    remaining = client.get(
        f"/api/meetings/{meeting['meeting_id']}/participants"
    ).json()
    assert all(p["id"] != pid for p in remaining)


def test_mute_all(client):
    meeting = _new_meeting(client)
    for name in ("Alice", "Bob"):
        client.post(
            f"/api/meetings/{meeting['meeting_id']}/join",
            json={"display_name": name},
        )
    resp = client.patch(
        f"/api/meetings/{meeting['meeting_id']}/mute-all", json={"is_muted": True}
    )
    assert resp.status_code == 200
    assert resp.json()["updated_count"] == 2  # host is excluded

    participants = client.get(
        f"/api/meetings/{meeting['meeting_id']}/participants"
    ).json()
    host = next(p for p in participants if p["role"] == "host")
    assert host["is_muted"] is False


def test_remove_participant(client):
    meeting = _new_meeting(client)
    pid = client.post(
        f"/api/meetings/{meeting['meeting_id']}/join",
        json={"display_name": "Alice"},
    ).json()["participant"]["id"]
    resp = client.delete(
        f"/api/meetings/{meeting['meeting_id']}/participants/{pid}"
    )
    assert resp.status_code == 200
    remaining = client.get(
        f"/api/meetings/{meeting['meeting_id']}/participants"
    ).json()
    assert all(p["id"] != pid for p in remaining)


def test_remove_participant_not_found(client):
    meeting = _new_meeting(client)
    resp = client.delete(
        f"/api/meetings/{meeting['meeting_id']}/participants/9999"
    )
    assert resp.status_code == 404
