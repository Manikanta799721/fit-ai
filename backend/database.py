from pymongo import MongoClient

MONGO_URL = "mongodb+srv://fitai:fitai123@cluster0.ld3s9h8.mongodb.net/?appName=Cluster0"

client = MongoClient(MONGO_URL)

db = client["fitai_db"]

users_collection = db["users"]

wishlist_collection = db["wishlist"]