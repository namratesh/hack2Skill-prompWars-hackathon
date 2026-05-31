from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import trips, weather

load_dotenv()

app = FastAPI(
    title="Travel Planning Experience Engine",
    description="AI-powered dynamic travel planner",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)

app.include_router(trips.router)
app.include_router(weather.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "travel-engine-api"}
