from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
# SQLAlchemy → A Python library to work with databases using Python objects instead of raw SQL.
# Load environment variables from .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Create the SQLAlchemy engine
# Create the database engine
engine = create_engine(DATABASE_URL)

# Each instance of the SessionLocal class will be a database session.
# A session is like a “workspace” for talking to the database.
# SessionLocal is a factory → each time you call it, you get a new Session.
# autocommit=False → You must call commit() manually.
# autoflush=False → It won’t push changes to the DB until you explicitly commit.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# This Base class will be inherited by our ORM models (our database tables)
# This is the base class for all your database models (tables).
Base = declarative_base()
# Add this to the end of backend/database.py
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
# engine → Connects to the database.
# SessionLocal → Creates sessions for talking to the DB.
# Base → Base class for defining tables.
# get_db() → Makes sure every request gets its own safe DB session.