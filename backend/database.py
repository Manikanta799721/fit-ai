import os

import certifi
from dotenv import load_dotenv
from pymongo import ASCENDING, MongoClient
from pymongo.errors import PyMongoError

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/fitai_db")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "fitai_db")

client_options = {
    "serverSelectionTimeoutMS": 5000,
}

if MONGO_URL.startswith("mongodb+srv://"):
    client_options.update({
        "tls": True,
        "tlsCAFile": certifi.where(),
    })

client = MongoClient(
    MONGO_URL,
    **client_options,
)

db = client[MONGO_DB_NAME]

users_collection = db["users"]
wishlist_collection = db["wishlist"]

try:
    users_collection.create_index([("email", ASCENDING)], unique=True)
    wishlist_collection.create_index([("email", ASCENDING), ("id", ASCENDING)], unique=True)
except PyMongoError:
    pass
