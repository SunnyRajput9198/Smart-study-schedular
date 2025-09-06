# backend/security.py
from passlib.context import CryptContext
from jose import JWTError,jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import models
import database
# passlib → For password hashing and verification.
# jose → For encoding/decoding JWT tokens.
# datetime → To set expiry times on tokens.
# FastAPI security → Handles OAuth2 & dependency injection.
# SQLAlchemy Session → Used to query users from DB.
# models & database → Your app’s user model & DB connection
load_dotenv()

# Get secret key and algorithm from environment variables
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Setup for password hashing
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
# pwd_context uses bcrypt to hash passwords.
# verify_password → compares plain password with hashed password in DB.
# get_password_hash → hashes a new password before saving to DB.
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# Function to create a JWT access token
# Takes user data (e.g., {"sub": username}).
# Adds expiration time (exp).
# Encodes into a JWT using your SECRET_KEY.
# Returns a signed JWT string.
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
# Tells FastAPI:
# Clients will send tokens in the Authorization: Bearer <token> header.
# The login route (/auth/login) will issue these tokens.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
# Reads the token from request header.
# Decodes JWT using your SECRET_KEY.
# Extracts the sub field (subject = usually username).
# Queries the DB for that user.
# If no user or invalid token → raises 401 Unauthorized.
# If valid → returns the User object.
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user