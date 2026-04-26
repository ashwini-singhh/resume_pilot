import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(override=True)

database_url = os.getenv("DATABASE_URL")
# Handle the postgres:// vs postgresql:// mismatch
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

if not database_url:
    print("❌ No DATABASE_URL found in .env")
    exit(1)

try:
    print(f"📡 Connecting directly to Postgres...")
    conn = psycopg2.connect(database_url)
    conn.autocommit = True
    cur = conn.cursor()

    # Define columns to add
    columns = [
        ("max_spend", "DOUBLE PRECISION DEFAULT 5.0"),
        ("current_spend", "DOUBLE PRECISION DEFAULT 0.0")
    ]

    for col_name, col_type in columns:
        try:
            # We use quoted identifier "user" because it is a reserved word
            cur.execute(f'ALTER TABLE "user" ADD COLUMN {col_name} {col_type};')
            print(f"✅ Successfully added column: {col_name}")
        except psycopg2.errors.DuplicateColumn:
            print(f"ℹ️ Column '{col_name}' already exists, skipping.")
        except Exception as e:
            print(f"❌ Error adding column '{col_name}': {e}")
    
    cur.close()
    conn.close()
    print("🚀 Direct Postgres migration complete.")

except Exception as e:
    print(f"🚨 Connection failed: {e}")
