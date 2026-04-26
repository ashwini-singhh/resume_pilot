import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

database_url = os.getenv("DATABASE_URL")
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

if not database_url:
    print("No DATABASE_URL found in .env")
    exit(1)

engine = create_engine(database_url)

with engine.connect() as conn:
    print("📡 Connected to Database. Checking columns...")
    
    # 1. Add missing columns to 'user' table
    try:
        conn.execute(text('ALTER TABLE "user" ADD COLUMN max_spend FLOAT DEFAULT 5.0'))
        conn.commit()
        print("✅ Added 'max_spend' to 'user' table.")
    except Exception as e:
        if "already exists" in str(e).lower():
            print("ℹ️ 'max_spend' already exists.")
        else:
            print(f"❌ Error adding 'max_spend': {e}")

    try:
        conn.execute(text('ALTER TABLE "user" ADD COLUMN current_spend FLOAT DEFAULT 0.0'))
        conn.commit()
        print("✅ Added 'current_spend' to 'user' table.")
    except Exception as e:
        if "already exists" in str(e).lower():
            print("ℹ️ 'current_spend' already exists.")
        else:
            print(f"❌ Error adding 'current_spend': {e}")

    # 2. Ensure llmusage table exists (create_all might have failed if startup crashed early)
    try:
        from core.models import SQLModel
        # Make sure the models are imported so they are registered in SQLModel.metadata
        import core.models
        SQLModel.metadata.create_all(engine)
        print("✅ Verified all tables (including 'llmusage') exist.")
    except Exception as e:
        print(f"❌ Error verifying tables: {e}")

print("🚀 Migration script complete.")
