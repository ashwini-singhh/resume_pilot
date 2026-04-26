import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

database_url = os.getenv("DATABASE_URL")
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(database_url or "sqlite:///resume_data.db")

with engine.begin() as conn:
    print("Dropping old columns...")
    conn.execute(text("ALTER TABLE usercontext DROP COLUMN IF EXISTS experience_level;"))
    conn.execute(text("ALTER TABLE usercontext DROP COLUMN IF EXISTS target_roles;"))
    conn.execute(text("ALTER TABLE usercontext DROP COLUMN IF EXISTS primary_skills;"))
    conn.execute(text("ALTER TABLE usercontext DROP COLUMN IF EXISTS industries;"))
    conn.execute(text("ALTER TABLE usercontext DROP COLUMN IF EXISTS target_companies;"))
    conn.execute(text("ALTER TABLE usercontext DROP COLUMN IF EXISTS goals;"))
    print("Adding new JSON columns...")
    conn.execute(text("ALTER TABLE usercontext ADD COLUMN IF NOT EXISTS onboarding_context JSON;"))
    conn.execute(text("ALTER TABLE usercontext ADD COLUMN IF NOT EXISTS chat_context JSON;"))
    print("Done!")
