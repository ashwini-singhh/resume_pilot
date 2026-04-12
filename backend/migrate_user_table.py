from sqlmodel import Session, create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("DATABASE_URL not found in .env")
    exit(1)

engine = create_engine(database_url)

def run_migration():
    with Session(engine) as session:
        print("Running database migration...")
        
        # Add subscription_status
        try:
            session.exec(text('ALTER TABLE "user" ADD COLUMN subscription_status VARCHAR DEFAULT \'free\';'))
            print("Added column subscription_status")
        except Exception as e:
            print(f"Failed to add subscription_status (might already exist): {e}")
        
        # Add free_runs_remaining
        try:
            session.exec(text('ALTER TABLE "user" ADD COLUMN free_runs_remaining INTEGER DEFAULT 5;'))
            print("Added column free_runs_remaining")
        except Exception as e:
            print(f"Failed to add free_runs_remaining (might already exist): {e}")

        # Add stripe_customer_id
        try:
            session.exec(text('ALTER TABLE "user" ADD COLUMN stripe_customer_id VARCHAR;'))
            print("Added column stripe_customer_id")
        except Exception as e:
            print(f"Failed to add stripe_customer_id (might already exist): {e}")

        # Add stripe_subscription_id
        try:
            session.exec(text('ALTER TABLE "user" ADD COLUMN stripe_subscription_id VARCHAR;'))
            print("Added column stripe_subscription_id")
        except Exception as e:
            print(f"Failed to add stripe_subscription_id (might already exist): {e}")

        session.commit()
        print("Migration complete.")

if __name__ == "__main__":
    run_migration()
