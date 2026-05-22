import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.database import engine, Base
from app.models import user, meeting  # noqa: F401 — ensure models are registered
from app.routers import meetings, participants


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Zoom Clone API", version="1.0.0", lifespan=lifespan)

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings.router)
app.include_router(participants.router)


@app.get("/")
def root():
    return {"message": "Zoom Clone API is running", "docs": "/docs"}
