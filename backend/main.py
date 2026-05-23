from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import wishlist_collection

import pandas as pd
import random
from pathlib import Path

from database import users_collection
from models import UserSignup, UserLogin
from auth import (
    hash_password,
    verify_password,
    create_access_token
)

# ---------------- APP ---------------- #

app = FastAPI()

# ---------------- CORS ---------------- #

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- DATASET ---------------- #

SEARCHABLE_COLUMNS = [
    "masterCategory",
    "subCategory",
    "articleType",
    "productDisplayName",
    "brand",
    "style",
    "vibe",
    "occasion",
    "trend",
    "usage",
]

ESSENTIAL_COLUMNS = [
    "id",
    "gender",
    "masterCategory",
    "subCategory",
    "articleType",
    "baseColour",
    "season",
    "productDisplayName",
]


def load_catalog():
    styles = pd.read_csv("styles.csv", sep="\t")

    curated_path = Path("fashion_catalog.csv")
    if curated_path.exists():
        curated = pd.read_csv(curated_path, sep="\t")
        styles = pd.concat([curated, styles], ignore_index=True, sort=False)

    for column in ["brand", "style", "vibe", "occasion", "trend", "usage", "image_url"]:
        if column not in styles.columns:
            styles[column] = ""

    return styles.dropna(subset=ESSENTIAL_COLUMNS).drop_duplicates(subset=["id"])


df = load_catalog()

# ---------------- IMAGES ---------------- #

app.mount("/images", StaticFiles(directory="images"), name="images")

# ---------------- HOME ---------------- #

@app.get("/")
def home():
    return {
        "message": "FIT.AI Backend Running 🚀"
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

    existing = wishlist_collection.find_one({
        "email": email,
        "id": product["id"]
    })

    if existing:
        return {
            "message": "Already saved"
        }

    wishlist_collection.insert_one({
        "email": email,
        **product
    })

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

    genders = sorted(
        df["gender"].dropna().unique().tolist()
    )

    colours = sorted(
        df["baseColour"].dropna().unique().tolist()
    )

    seasons = sorted(
        df["season"].dropna().unique().tolist()
    )

    categories = sorted(
        df["subCategory"].dropna().unique().tolist()
    )

    return {
        "genders": genders,
        "colours": colours,
        "seasons": seasons,
        "categories": categories
    }

# ---------------- RECOMMEND ---------------- #

def matches_category(catalog, category):
    return (
        catalog["subCategory"].astype(str).str.lower().str.contains(category, na=False) |
        catalog["articleType"].astype(str).str.lower().str.contains(category, na=False) |
        catalog["masterCategory"].astype(str).str.lower().str.contains(category, na=False)
    )


def matches_search(catalog, search):
    search_words = search.split()

    if not search_words:
        return pd.Series(False, index=catalog.index)

    word_matches = []

    for word in search_words:
        word_matches.append(
            pd.concat(
                [
                    catalog[column].astype(str).str.lower().str.contains(word, na=False)
                    for column in SEARCHABLE_COLUMNS
                    if column in catalog.columns
                ],
                axis=1
            ).any(axis=1)
        )

    return pd.concat(word_matches, axis=1).any(axis=1)


def ranked_fallback(catalog, gender, colour, season, category, search):
    scored = catalog.copy()
    score = pd.Series(0, index=scored.index)

    if gender:
        score += (scored["gender"].astype(str).str.lower() == gender).astype(int) * 5

    if colour:
        score += (scored["baseColour"].astype(str).str.lower() == colour).astype(int) * 4

    if season:
        score += (scored["season"].astype(str).str.lower() == season).astype(int) * 3

    if category:
        score += matches_category(scored, category).astype(int) * 6

    if search and search not in ["trending", "trend", "popular"]:
        score += matches_search(scored, search).astype(int) * 4
    elif search:
        score += 1

    scored["_score"] = score
    scored = scored[scored["_score"] > 0]

    if scored.empty:
        return catalog.sample(n=min(len(catalog), 20), random_state=42)

    return scored.sort_values(["_score", "id"], ascending=[False, False])


def product_image(row):
    image_url = str(row.get("image_url", "")).strip()

    if image_url and image_url.lower() != "nan":
        return image_url

    return f"http://127.0.0.1:8000/images/{row['id']}.jpg"

@app.get("/recommend")
def recommend(
    gender: str = "",
    colour: str = "",
    season: str = "",
    category: str = "",
    search: str = ""
):

    filtered = df.copy()
    source = df.copy()

    gender = gender.strip().lower()
    colour = colour.strip().lower()
    season = season.strip().lower()
    category = category.strip().lower()
    search = search.strip().lower()

    # ---------- FILTERS ---------- #

    if gender:
        filtered = filtered[
            filtered["gender"].str.lower() == gender
        ]

    if colour:
        filtered = filtered[
            filtered["baseColour"].str.lower() == colour
        ]

    if season:
        filtered = filtered[
            filtered["season"].str.lower() == season
        ]

    if category:
        filtered = filtered[matches_category(filtered, category)]

    # ---------- SEARCH ---------- #

    if search:
        if search in ["trending", "trend", "popular"]:
            filtered = filtered.sample(
                n=min(len(filtered), 20),
                random_state=42
            )
        else:
            filtered = filtered[matches_search(filtered, search)]

    # ---------- CLEAN ---------- #

    filtered = filtered.dropna(subset=ESSENTIAL_COLUMNS)

    if len(filtered) < 20:
        backup = ranked_fallback(source, gender, colour, season, category, search)
        filtered = pd.concat([
            filtered,
            backup[~backup["id"].isin(filtered["id"])]
        ]).drop_duplicates(subset=["id"])

    filtered = filtered.head(20)

    results = []

    # ---------- RESULTS ---------- #

    for _, row in filtered.iterrows():

        results.append({
            "id": int(row["id"]),
            "image": product_image(row),
            "productDisplayName": row["productDisplayName"],
            "masterCategory": row["masterCategory"],
            "subCategory": row["subCategory"],
            "articleType": row["articleType"],
            "baseColour": row["baseColour"],
            "season": row["season"],
            "gender": row["gender"],
            "brand": row.get("brand", "Generic"),
            "style": row.get("style", "Curated"),
            "vibe": row.get("vibe", "Fresh"),
            "trend": row.get("trend", "Trending"),
            "match": random.randint(90, 99),
            "aiReason": f"Picked for {row['baseColour']} {row['articleType']} styling with a {row.get('vibe', 'fresh')} vibe.",
            "scoreBreakdown": {
                "profileFit": random.randint(88, 99)
            }
        })

    return results
