import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import wishlist_collection
from datetime import datetime, timezone

from database import users_collection
from models import UserSignup, UserLogin
from auth import (
    hash_password,
    verify_password,
    create_access_token
)
from recommender import filter_values, load_catalog, recommend_products

# ---------------- APP ---------------- #

load_dotenv()

app = FastAPI()
BASE_DIR = Path(__file__).resolve().parent
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
    ).split(",")
    if origin.strip()
]

# ---------------- CORS ---------------- #

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- DATASET ---------------- #

df = load_catalog()

# ---------------- IMAGES ---------------- #

images_dir = BASE_DIR / "images"
if images_dir.exists():
    app.mount("/images", StaticFiles(directory=images_dir), name="images")

# ---------------- HOME ---------------- #

@app.get("/")
def home():
    return {
        "message": "FIT.AI Backend Running"
    }

# ---------------- AUTH ---------------- #

@app.post("/signup")
def signup(user: UserSignup):
    email = user.email.strip().lower()
    username = user.username.strip()

    existing_user = users_collection.find_one({
        "email": email
    })

    if existing_user:
        raise HTTPException(status_code=409, detail="User already exists")

    if not username or not email or not user.password:
        raise HTTPException(status_code=400, detail="All fields are required")

    hashed_password = hash_password(
        user.password
    )

    new_user = {
        "username": username,
        "email": email,
        "password": hashed_password
    }

    users_collection.insert_one(new_user)

    return {
        "message": "Signup successful"
    }

# ---------------- LOGIN ---------------- #

@app.post("/login")
def login(user: UserLogin):
    email = user.email.strip().lower()

    existing_user = users_collection.find_one({
        "email": email
    })

    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")

    valid_password = verify_password(
        user.password,
        existing_user["password"]
    )

    if not valid_password:
        raise HTTPException(status_code=401, detail="Invalid password")

    token = create_access_token({
        "email": email
    })

    return {
        "message": "Login successful",
        "token": token,
        "username": existing_user["username"],
        "email": email
    }

@app.post("/save-wishlist")
def save_wishlist(data: dict):

    email = (data.get("email") or "").strip().lower()
    product = data.get("product")

    if not email or not product or "id" not in product:
        raise HTTPException(status_code=400, detail="Email and product are required")

    wishlist_collection.update_one(
        {"email": email, "id": product["id"]},
        {
            "$set": {
                "email": email,
                **product,
                "updatedAt": datetime.now(timezone.utc)
            },
            "$setOnInsert": {
                "createdAt": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )

    return {
        "message": "Wishlist saved"
    }

@app.get("/wishlist/{email}")
def get_wishlist(email: str):
    clean_email = email.strip().lower()

    items = list(
        wishlist_collection.find(
            {"email": clean_email},
            {"_id": 0}
        )
    )

    return items

@app.delete("/wishlist/{email}/{product_id}")
def delete_wishlist_item(email: str, product_id: int):
    result = wishlist_collection.delete_one({
        "email": email.strip().lower(),
        "id": product_id
    })

    return {
        "message": "Wishlist item removed" if result.deleted_count else "Wishlist item not found"
    }

# ---------------- VALUES ---------------- #

@app.get("/values")
def get_values():
    return filter_values(df)

@app.get("/recommend")
def recommend(
    gender: str = "",
    colour: str = "",
    season: str = "",
    category: str = "",
    search: str = ""
):
    return recommend_products(df, gender, colour, season, category, search)
