from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum as SQLEnum, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base

# Enums
class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    PAID = "paid"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

# Order Model
class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String(50), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    dosage_form = Column(String, nullable=True)
    medication_name = Column(String, nullable=True)
    strength = Column(String, nullable=True)
    frequency = Column(String, nullable=True)
    prescription_image = Column(String, nullable=True) 
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    quantity = Column(Integer, default=1)
    delivery_address = Column(String(500), nullable=True)
    # rejection_reason = Column(Text)
    # delivery_address = Column(String(500), nullable=False)
    
    delivery_fee = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="orders")
