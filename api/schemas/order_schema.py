from typing import Optional
from datetime import datetime
from pydantic import Field
from pydantic import BaseModel
from models.order_model import *

class OderStatus(str):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class CreateOrderRequest(BaseModel):
    # user_id: int
    medication_name: str
    # quantity: int
    # delivery_address: str

class OrderResponse(BaseModel):
    order_id: str
    user_id: int
    dosage_form: Optional[str]
    medication_name: Optional[str]
    strength: Optional[str]
    frequency: Optional[str]
    prescription_image: Optional[str]
    quantity: int = Field(1, ge=1, le=99)
    status: OrderStatus
    created_at: datetime
    updated_at: datetime
    message: str

    class Config:
        from_attributes = True

class OrderUpdateQuantity(BaseModel):
    quantity: int = Field(..., ge=1, le=99)