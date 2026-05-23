# Database Schema

Five tables, all timestamps stored as `TIMESTAMP WITH TIME ZONE` (UTC). The
canonical migration lives in `backend/alembic/versions/`.

```
       users                                          chat_messages
┌──────────────────┐                                ┌──────────────────────┐
│ id        PK     │                                │ id              PK   │
│ name             │                                │ meeting_id      FK ─┐│
│ email     UNIQUE │                                │ participant_id  FK ─┼┼┐
│ avatar_url       │                                │ display_name        │││
│ created_at       │                                │ body                │││
└────────┬─────────┘                                │ created_at          │││
         │                                          └──────────────────────┘││
         │                                                                  ││
         │           meetings                                   participants││
         │     ┌────────────────────┐                ┌─────────────────────┐││
         │     │ id            PK   │                │ id            PK    │││
         └─────┤ host_id       FK   │                │ meeting_id    FK ───┼┼┘
               │ meeting_id  UNIQUE │                │ user_id       FK    ││
               │ title              │                │ display_name        ││
               │ description        │                │ role                ││
               │ type               │                │ is_muted            ││
               │ status             │                │ is_video_off        ││
               │ scheduled_at       │                │ joined_at           ││
               │ duration_mins      │◄───────────────┤ left_at             ││
               │ invite_link UNIQUE │                └─────────────────────┘│
               │ started_at         │◄───────────────┐                      │
               │ ended_at           │                │  recordings          │
               │ created_at         │                │ ┌──────────────────┐ │
               └────────────────────┘                │ │ id           PK  │ │
                                                     └─┤ meeting_id   FK  │ │
                                                       │ created_by_part. │ │
                                                       │ title            │ │
                                                       │ filename         │ │
                                                       │ duration_secs    │ │
                                                       │ size_bytes       │ │
                                                       │ status           │ │
                                                       │ created_at       │ │
                                                       └──────────────────┘ │
```

## `users`

Holds the single implicit user (id=1). The application enforces no auth, but the
table is here so meetings have a real foreign key for the host.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | int PK | Autoincrement. |
| `name` | varchar(100) | Required. |
| `email` | varchar(255) | Unique, required. |
| `avatar_url` | varchar(500) | Nullable. |
| `created_at` | timestamptz | Default `now()`. |

## `meetings`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | int PK | Internal autoincrement. |
| `meeting_id` | varchar(20) | Unique human-friendly id, format `xxx-xxxx-xxxx`. |
| `title` | varchar(200) | Required. |
| `description` | varchar(2000) | Nullable. |
| `host_id` | int FK → `users.id` | ON DELETE CASCADE. |
| `type` | varchar(20) | `instant` \| `scheduled` (CHECK constraint). |
| `status` | varchar(20) | `waiting` \| `active` \| `ended` (CHECK). |
| `scheduled_at` | timestamptz | Nullable. |
| `duration_mins` | int | Default 60. |
| `invite_link` | varchar(500) | Unique. |
| `started_at` | timestamptz | Set when status → `active`. |
| `ended_at` | timestamptz | Set when status → `ended`. |
| `created_at` | timestamptz | Default `now()`. |

## `participants`

Tracks every join event. Departures are soft (`left_at` set) so attendance can
be reconstructed for "recent meetings".

| Column | Type | Notes |
| --- | --- | --- |
| `id` | int PK | Autoincrement. |
| `meeting_id` | int FK → `meetings.id` | ON DELETE CASCADE. |
| `user_id` | int FK → `users.id` | Nullable (guests have no row in `users`). |
| `display_name` | varchar(100) | The name typed at join. |
| `role` | varchar(20) | `host` \| `participant` (CHECK). |
| `is_muted` | bool | Default false. |
| `is_video_off` | bool | Default false. |
| `joined_at` | timestamptz | Default `now()`. |
| `left_at` | timestamptz | Null until the participant leaves. |

## `chat_messages`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | int PK | Autoincrement. |
| `meeting_id` | int FK → `meetings.id` | ON DELETE CASCADE. |
| `participant_id` | int FK → `participants.id` | Nullable, ON DELETE SET NULL. |
| `display_name` | varchar(100) | Denormalized sender name. |
| `body` | varchar(2000) | The message text. |
| `created_at` | timestamptz | Default `now()`. |

`display_name` is denormalized so old messages still render correctly even if a
participant row is later modified.

## `recordings`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | int PK | Autoincrement. |
| `meeting_id` | int FK → `meetings.id` | ON DELETE CASCADE. |
| `created_by_participant_id` | int FK → `participants.id` | Nullable, ON DELETE SET NULL. |
| `title` | varchar(200) | Required. |
| `filename` | varchar(255) | Stored under `RECORDINGS_DIR`. |
| `duration_secs` | int | Default 0. |
| `size_bytes` | int | Default 0. |
| `status` | varchar(20) | Always `ready` today; reserved for future processing pipeline. |
| `created_at` | timestamptz | Default `now()`. |

## Relationship summary

- A **user** hosts many **meetings** (CASCADE delete).
- A **meeting** has many **participants**, **chat_messages**, and **recordings**
  (all CASCADE delete).
- A **chat_message** and a **recording** each optionally reference the
  **participant** who created them (`SET NULL` if that participant is hard-deleted,
  which only happens via the meeting cascade).
