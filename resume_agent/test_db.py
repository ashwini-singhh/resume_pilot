from sqlmodel import Session, select
from core.models import engine, User, init_db
init_db()
with Session(engine) as session:
    user = session.exec(select(User)).first()
    print("User inside test:", user)
