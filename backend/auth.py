import os
from types import SimpleNamespace

from dotenv import load_dotenv
import bcrypt as bcrypt_backend
from importlib.metadata import version
from jose import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-before-deploying")
ALGORITHM = "HS256"
MAX_BCRYPT_PASSWORD_BYTES = 72

if not hasattr(bcrypt_backend, "__about__"):
    bcrypt_backend.__about__ = SimpleNamespace(
        __version__=version("bcrypt")
    )

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str):
    if len(password.encode("utf-8")) > MAX_BCRYPT_PASSWORD_BYTES:
        raise ValueError("Password cannot be longer than 72 bytes")
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    if len(plain_password.encode("utf-8")) > MAX_BCRYPT_PASSWORD_BYTES:
        return False
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(days=1)

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return encoded_jwt
