from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Session, JSON, Column, create_engine

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RawSource(SQLModel, table=True):
    """Raw ingested data from PDF, GitHub, or Manual Input."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    source_type: str  # "pdf", "github", "manual"
    data: Dict[Any, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class MasterProfile(SQLModel, table=True):
    """The canonical, LLM-condensed user profile. This powers the Dashboard UI."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    # The JSON schema matches the UI dictionary but every list/bullet has a unique UUID injected.
    data: Dict[Any, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class JobDescription(SQLModel, table=True):
    """Target roles for optimization."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    title: str
    company: str
    original_text: str
    keywords: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OptimizationSuggestion(SQLModel, table=True):
    """LLM-proposed diffs for specific resume bullets tailored to a JD."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    jd_id: int = Field(foreign_key="jobdescription.id")
    target_uuid: str  # The UUID of the bullet/section in the MasterProfile JSON
    original_text: str
    proposed_text: str
    status: str = Field(default="pending")  # "pending", "accepted", "rejected"
    created_at: datetime = Field(default_factory=datetime.utcnow)


# --- DB Initialization ---
sqlite_file_name = "resume_data.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url, echo=False)

def init_db():
    SQLModel.metadata.create_all(engine)
