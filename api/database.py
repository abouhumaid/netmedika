from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv
load_dotenv()

# postgresql://postgres:devhatch1@netmedika.c2fqkemcsrnr.us-east-1.rds.amazonaws.com:5432/netmedika

engine = create_engine(os.getenv("DATABASE_URL"))
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

Base = declarative_base()