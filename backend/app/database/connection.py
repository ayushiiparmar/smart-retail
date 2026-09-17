import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# If DATABASE_URL is set (e.g. Render Postgres), use it. Otherwise fall back
# to a local SQLite file at smart-retail/data/retail.db, so local development
# still works without any extra setup.
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Render (and some other hosts) hand out URLs starting with "postgres://",
    # but SQLAlchemy 1.4+/2.x require the "postgresql://" scheme.
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URL = DATABASE_URL
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
else:
    CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", ".."))
    DATA_DIR = os.path.join(PROJECT_ROOT, "data")
    os.makedirs(DATA_DIR, exist_ok=True)

    DB_PATH = os.path.join(DATA_DIR, "retail.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

    # check_same_thread=False allows FastAPI multithreaded requests with SQLite.
    # This flag is SQLite-specific and must not be passed to the Postgres engine.
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency for FastAPI route handlers
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()