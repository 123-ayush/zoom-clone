import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.logging_config import configure_logging
from app import models  # noqa: F401 — registers all ORM models
from app.routers import chat, meetings, participants, recordings
from app.ws.router import router as ws_router

configure_logging()
logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dev fallback so the app runs without migrations. Production uses Alembic.
    Base.metadata.create_all(bind=engine)
    logger.info("Zoom Clone API started")
    yield
    logger.info("Zoom Clone API stopped")


app = FastAPI(title="Zoom Clone API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s -> %d (%.1fms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


app.include_router(meetings.router)
app.include_router(participants.router)
app.include_router(chat.router)
app.include_router(recordings.router)
app.include_router(ws_router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}


@app.get("/", tags=["meta"])
def root():
    return {"message": "Zoom Clone API is running", "docs": "/docs"}
