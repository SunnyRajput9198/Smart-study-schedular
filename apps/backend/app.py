# backend/app.py (Final Version with ML Integration)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables from .env file at the very start
load_dotenv()

import models
from database import engine

# Import all routers from the 'routers' directory
from routes import subjects, tasks, sessions, auth
import routes.ml_endpoint as ml_endpoints

# This line ensures all database tables are created based on your models
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Study Scheduler API",
    description="An AI-powered API to manage study schedules and get smart recommendations.",
    version="1.0.0"
)

# This is a startup event handler. It runs this code once when the server
# starts, loading the ML models into memory for fast predictions.
@app.on_event("startup")
async def startup_event():
    print("Server is starting up, initializing ML components...")
    ml_endpoints.initialize_ml_components()

# CORS Middleware allows your frontend (localhost:3000) to talk to this backend
origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all the API routers to make their endpoints available
app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(tasks.router)
app.include_router(sessions.router)
app.include_router(ml_endpoints.router)

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the Smart Study Scheduler API!"}

@app.get("/test/db")
async def test_database():
    try:
        import asyncpg
        DATABASE_URL = os.getenv("DATABASE_URL")
        conn = await asyncpg.connect(DATABASE_URL)
        result = await conn.fetchval("SELECT 1")
        await conn.close()
        return {"status": "Database connection successful", "result": result}
    except Exception as e:
        return {"status": "Database connection failed", "error": str(e)}

