import os
from datetime import datetime
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
from sqlmodel import SQLModel, Field, Session, JSON, Column, create_engine

load_dotenv()

class User(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    name: str
    email: str
    is_onboarded: bool = Field(default=False)
    
    # Subscription & Payments
    subscription_status: str = Field(default="free") # free, active, expired
    free_runs_remaining: int = Field(default=5)
    stripe_customer_id: Optional[str] = Field(default=None)
    stripe_subscription_id: Optional[str] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserContext(SQLModel, table=True):
    """Structured context collected during onboarding per profile."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    name: str = Field(default="Default Profile")
    onboarding_context: Dict[Any, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    chat_context: Dict[Any, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RawSource(SQLModel, table=True):
    """Raw ingested data from PDF, GitHub, or Manual Input for a specific profile."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    context_id: Optional[int] = Field(default=None, foreign_key="usercontext.id")
    source_type: str  # "pdf", "github", "manual"
    data: Dict[Any, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class MasterProfile(SQLModel, table=True):
    """The canonical, LLM-condensed user profile for a specific context."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    context_id: Optional[int] = Field(default=None, foreign_key="usercontext.id")
    data: Dict[Any, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class JobDescription(SQLModel, table=True):
    """Target roles for optimization."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    context_id: Optional[int] = Field(default=None, foreign_key="usercontext.id")
    title: str
    company: str
    original_text: str
    keywords: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OptimizationSuggestion(SQLModel, table=True):
    """LLM-proposed diffs for specific resume bullets tailored to a JD."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    context_id: Optional[int] = Field(default=None, foreign_key="usercontext.id")
    jd_id: Optional[int] = Field(default=None, foreign_key="jobdescription.id")
    target_uuid: str  # The UUID of the bullet/section in the MasterProfile JSON
    original_text: str
    proposed_text: str
    diff_data: Optional[List[Any]] = Field(default=None, sa_column=Column(JSON))
    status: str = Field(default="pending")  # "pending", "accepted", "rejected"
    trigger_source: str = Field(default="system")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EntryScore(SQLModel, table=True):
    """Stage 1 — JD relevance score per resume entry."""
    __tablename__ = "entryscore"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    context_id: Optional[int] = Field(default=None, foreign_key="usercontext.id")
    jd_id: int = Field(foreign_key="jobdescription.id")
    entry_id: str                          # e.g. "exp_0", "proj_2"
    score: float = Field(default=0.0)
    decision: str = Field(default="OPTIONAL")   # KEEP | OPTIONAL | REMOVE
    matched_keywords: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    missing_keywords: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    reasoning: str = Field(default="")
    recruiter_note: str = Field(default="")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class GapAnalysis(SQLModel, table=True):
    """Stage 3 — Gap analysis result for a JD x resume pair."""
    __tablename__ = "gapanalysis"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    context_id: Optional[int] = Field(default=None, foreign_key="usercontext.id")
    jd_id: int = Field(foreign_key="jobdescription.id")
    missing_skills: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    missing_keywords: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    suggestions: str = Field(default="")
    created_at: datetime = Field(default_factory=datetime.utcnow)


# --- DB Initialization ---
sqlite_file_name = "resume_data.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

# Toggle: DB_MODE="local" forces SQLite, "remote" uses DATABASE_URL if available.
db_mode = os.getenv("DB_MODE", "remote").lower()
database_url = os.getenv("DATABASE_URL")
use_postgres = False

if db_mode == "remote" and database_url:
    # SQLAlchemy 1.4+ requires 'postgresql://' not 'postgres://'
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    engine_url = database_url
    use_postgres = True
else:
    engine_url = sqlite_url

engine = create_engine(engine_url, echo=False)

def init_db():
    SQLModel.metadata.create_all(engine)
    if not use_postgres:
        print(f"📡 Using Local SQLite: {sqlite_file_name}")
    else:
        print("🔗 Using Supabase Postgres")
