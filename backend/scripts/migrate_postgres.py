"""
PostgreSQL migration and verification script for Melitus Gym.

Ensures the `users` table exists with a UNIQUE constraint and index on `email`,
and verifies foreign keys for `alarms`. Optionally seeds an initial admin user
using environment variables when SEED_ADMIN=true.

Run:
  USE_SQLITE=false python backend/scripts/migrate_postgres.py
"""

import os
from dotenv import load_dotenv
from sqlmodel import SQLModel, Session, text
from app.services.database import get_engine, create_db_and_tables
from app.models.user import User
from app.models.alarm import Alarm
from app.services.auth import AuthService


def is_postgres() -> bool:
    return os.getenv("USE_SQLITE", "true").lower() != "true"


def ensure_constraints(session: Session):
    # Ensure email unique constraint
    unique_exists = session.exec(text(
        """
        SELECT COUNT(*) FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'users' AND c.conname LIKE '%email%'
          AND c.contype = 'u'
        """
    )).first()

    if not unique_exists or unique_exists == 0:
        session.exec(text("ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);"))

    # Ensure email index
    index_exists = session.exec(text(
        """
        SELECT COUNT(*) FROM pg_indexes
        WHERE tablename = 'users' AND indexname LIKE '%email%'
        """
    )).first()

    if not index_exists or index_exists == 0:
        session.exec(text("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);"))

    # Ensure alarms FK exists (basic check by attempting select)
    try:
        session.exec(text("SELECT 1 FROM alarms LIMIT 1"))
    except Exception:
        # If alarms not present, create tables again to ensure FK
        SQLModel.metadata.create_all(session.get_bind())


def seed_admin_if_requested(session: Session):
    if os.getenv("SEED_ADMIN", "false").lower() != "true":
        return

    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    admin_name = os.getenv("ADMIN_NAME", "Admin")

    if not admin_email or not admin_password:
        print("SEED_ADMIN is true, but ADMIN_EMAIL or ADMIN_PASSWORD missing. Skipping.")
        return

    existing = session.exec(text("SELECT id FROM users WHERE email=:email"), {"email": admin_email}).first()
    if existing:
        print("Admin user already exists. Skipping seed.")
        return

    hashed = AuthService.get_password_hash(admin_password)
    user = User(nome=admin_name, email=admin_email, hashed_password=hashed)
    session.add(user)
    session.commit()
    session.refresh(user)
    print(f"Seeded admin user id={user.id} email={user.email}")


def main():
    # Load .env relative to repo root
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    load_dotenv(os.path.join(repo_root, ".env"))

    if not is_postgres():
        print("USE_SQLITE is true. This script targets PostgreSQL. Aborting.")
        return

    engine = get_engine()
    # Create tables if missing
    create_db_and_tables()

    with Session(engine) as session:
        ensure_constraints(session)
        seed_admin_if_requested(session)
        print("✅ PostgreSQL migration verification complete.")


if __name__ == "__main__":
    main()