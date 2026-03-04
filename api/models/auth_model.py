from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, Integer
from datetime import datetime
from database import Base
import enum
from sqlalchemy.orm import relationship


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.CUSTOMER, nullable=False)
    last_login = Column(String(100), nullable=True)
    
    orders = relationship("Order",back_populates="owner",cascade="all, delete-orphan")