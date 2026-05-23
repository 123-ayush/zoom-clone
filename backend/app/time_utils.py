"""Timezone-aware datetime helpers.

SQLite does not persist timezone information, so values read back from it are
naive. These helpers keep all comparisons and API output unambiguously UTC.
"""
from datetime import datetime, timezone
from typing import Annotated

from pydantic import PlainSerializer


def utcnow() -> datetime:
    """Current time as a timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def ensure_aware(dt: datetime | None) -> datetime | None:
    """Attach UTC tzinfo to a naive datetime (e.g. one read back from SQLite)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _serialize_utc(dt: datetime) -> str:
    aware = dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return aware.astimezone(timezone.utc).isoformat()


# Pydantic datetime type that always serializes as an ISO-8601 string with a
# UTC offset, so the frontend never misinterprets a naive value as local time.
UtcDateTime = Annotated[datetime, PlainSerializer(_serialize_utc, return_type=str)]
