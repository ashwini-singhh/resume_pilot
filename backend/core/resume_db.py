from sqlmodel import Session, select
from .models import engine, User, MasterProfile, RawSource, JobDescription, OptimizationSuggestion, init_db

def ensure_default_user_and_profile(default_profile_data: dict):
    init_db()
    with Session(engine) as session:
        # Check if user exists
        user = session.exec(select(User)).first()
        if not user:
            user = User(name="Default User", email=default_profile_data.get("email", "default@example.com"))
            session.add(user)
            session.commit()
            session.refresh(user)
            
        # Check if MasterProfile exists
        profile = session.exec(select(MasterProfile).where(MasterProfile.user_id == user.id)).first()
        if not profile:
            profile = MasterProfile(user_id=user.id, data=default_profile_data)
            session.add(profile)
            session.commit()

def get_user_profile() -> dict:
    with Session(engine) as session:
        profile = session.exec(select(MasterProfile)).first()
        return profile.data if profile else {}

def reset_all_data(user_id: int):
    """Delete all records associated with a user to start fresh."""
    with Session(engine) as session:
        # Delete profile
        profile = session.exec(select(MasterProfile).where(MasterProfile.user_id == user_id)).first()
        if profile:
            session.delete(profile)
        
        # Delete raw sources
        sources = session.exec(select(RawSource).where(RawSource.user_id == user_id)).all()
        for s in sources:
            session.delete(s)
            
        # Delete Job Descriptions
        jds = session.exec(select(JobDescription).where(JobDescription.user_id == user_id)).all()
        for jd in jds:
            session.delete(jd)
            
        # Delete Suggestions
        suggestions = session.exec(select(OptimizationSuggestion).where(OptimizationSuggestion.user_id == user_id)).all()
        for sug in suggestions:
            session.delete(sug)
            
        session.commit()
