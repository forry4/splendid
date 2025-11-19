import os
from sqlalchemy import create_engine, Column, Integer, Text, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class GameState(Base):
    __tablename__ = "state"
    id = Column(Integer, primary_key=True)
    game_id = Column(String, unique=True)   # unique identifier for each game
    data = Column(Text)

def init_db():
    Base.metadata.create_all(bind=engine)
