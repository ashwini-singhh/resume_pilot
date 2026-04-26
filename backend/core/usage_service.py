import logging
from typing import Optional
from sqlmodel import Session, select
from core.models import engine, LLMUsage
from core.llm_client.response import TokenUsage

logger = logging.getLogger(__name__)

def record_usage(
    user_id: str,
    feature: str,
    model: str,
    usage: TokenUsage,
    run_id: Optional[str] = None
):
    """
    Persists LLM usage metadata to the database.
    """
    if not usage:
        return

    try:
        with Session(engine) as session:
            record = LLMUsage(
                user_id=user_id,
                run_id=run_id,
                feature=feature,
                model=model,
                prompt_tokens=usage.prompt_tokens,
                completion_tokens=usage.completion_tokens,
                total_tokens=usage.total_tokens,
                cost=usage.cost,
            )
            session.add(record)
            
            # Increment user's current_spend
            from core.models import User
            user = session.exec(select(User).where(User.id == user_id)).first()
            if user:
                user.current_spend += usage.cost
                session.add(user)
                
            session.commit()
    except Exception as e:
        logger.error(f"Failed to record LLM usage: {str(e)}")

def get_run_usage(run_id: str):
    """
    Returns aggregated cost and tokens for a specific run_id.
    """
    if not run_id:
        return {"run_cost": 0.0, "tokens_used": 0}

    try:
        from sqlalchemy import func
        with Session(engine) as session:
            # SQLModel handles this similarly to SQLAlchemy
            results = session.exec(select(
                func.sum(LLMUsage.cost),
                func.sum(LLMUsage.total_tokens)
            ).where(LLMUsage.run_id == run_id)).first()
            
            return {
                "run_cost": float(results[0] or 0.0),
                "tokens_used": int(results[1] or 0)
            }
    except Exception as e:
        logger.error(f"Failed to get run usage: {str(e)}")
        return {"run_cost": 0.0, "tokens_used": 0}
