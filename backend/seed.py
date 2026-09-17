"""
Run this once against a fresh database (SQLite or Postgres) to populate it
with demo data. Safe to run multiple times - it checks whether data already
exists and skips seeding if so.

Usage:
    cd backend
    python seed.py

Against Postgres: make sure DATABASE_URL is set in your environment first,
e.g. on Render's Shell tab for your backend service, or locally with:
    DATABASE_URL=postgresql://... python seed.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.connection import engine, Base, SessionLocal
from app.database.seed_data import seed_database
from app.models.category import Category

# Make sure tables exist before seeding (main.py does this too on startup,
# but this script can be run standalone).
Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    existing = db.query(Category).first()
    if existing:
        print("Database already has data - skipping seed. "
              "Delete existing rows first if you want to reseed.")
    else:
        result = seed_database(db)
        print(result)
finally:
    db.close()
