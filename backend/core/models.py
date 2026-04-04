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
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserContext(SQLModel, table=True):
    """Structured context collected during onboarding per profile."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    name: str = Field(default="Default Profile")
    experience_level: str
    target_roles: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    primary_skills: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    industries: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    target_companies: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    goals: str
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
    jd_id: int = Field(foreign_key="jobdescription.id")
    target_uuid: str  # The UUID of the bullet/section in the MasterProfile JSON
    original_text: str
    proposed_text: str
    status: str = Field(default="pending")  # "pending", "accepted", "rejected"
    trigger_source: str = Field(default="system")
    created_at: datetime = Field(default_factory=datetime.utcnow)


# --- DB Initialization ---
sqlite_file_name = "resume_data.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

# Check for Supabase / PostgreSQL in env
database_url = os.getenv("DATABASE_URL")
use_postgres = False

if database_url:
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
