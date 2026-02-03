from fastapi import APIRouter, File, Form, HTTPException, Depends, UploadFile
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import os
import shutil
from pathlib import Path
from models.auth_model import User
from utils.auth_func import get_current_user
from schemas.order_schema import *
from models.order_model import Order, OrderStatus
from database import get_db
from typing import Annotated


router = APIRouter(prefix="/api/v1/orders", tags=["orders"]) 

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads/prescriptions")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/create", response_model=OrderResponse, status_code=201)
async def create_order(
    db: Annotated[Session, Depends(get_db)],
    medicine_name: str | None = Form(None),
    uploaded_image: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user)
):
    try:
        # Validate that at least one input is provided
        if not medicine_name and not uploaded_image:
            raise HTTPException(
                status_code=400,
                detail="Please provide either medicine name or prescription image"
            )

        # Generate IDs
        order_id = f"ORD_{uuid.uuid4().hex[:12].upper()}"
        user_id = current_user.id if current_user else None
        
        # Handle image upload if provided
        image_path = None
        if uploaded_image:
            # Validate file type
            allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
            file_ext = os.path.splitext(uploaded_image.filename)[1].lower()
            
            if file_ext not in allowed_extensions:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid file type. Only images are allowed (jpg, jpeg, png, gif, webp)"
                )
            
            # Generate unique filename
            unique_filename = f"{order_id}_{uuid.uuid4().hex[:8]}{file_ext}"
            image_path = UPLOAD_DIR / unique_filename
            
            # Save the uploaded file
            with image_path.open("wb") as buffer:
                shutil.copyfileobj(uploaded_image.file, buffer)
            
            # Store relative path in database
            image_path = f"uploads/prescriptions/{unique_filename}"

        # Create order
        new_order = Order(
            order_id=order_id,
            user_id=user_id,
            medication_name=medicine_name,
            prescription_image=image_path, 
            status=OrderStatus.PENDING,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        db.add(new_order)
        db.commit()
        db.refresh(new_order)

        return OrderResponse(
            order_id=new_order.order_id,
            user_id=new_order.user_id,
            medication_name=new_order.medication_name,
            prescription_image=new_order.prescription_image,
            status=new_order.status,
            created_at=new_order.updated_at,
            updated_at=new_order.updated_at,
            message="Order created successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create order: {str(e)}"
        )


@router.get("/my-orders", response_model=dict)
async def get_my_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all orders for the currently logged-in user
    """
    try:
        # Query orders with ordering by creation date (newest first)
        orders = (
            db.query(Order)
            .filter(Order.user_id == current_user.id)
            .order_by(Order.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        total_orders = db.query(Order).filter(Order.user_id == current_user.id).count()
        
        return {
            "user_id": current_user.id,
            "total_orders": total_orders,
            "orders": [
                {
                    "order_id": order.order_id,
                    "medication_name": order.medication_name,
                    "prescription_image": order.prescription_image,
                    "quantity": order.quantity if hasattr(order, 'quantity') else 1,
                    "status": order.status.value if hasattr(order.status, 'value') else order.status,
                    "created_at": order.created_at.isoformat(),
                    "updated_at": order.updated_at.isoformat()
                }
                for order in orders
            ]
        }
    except Exception as e:
        print(f"Error fetching orders: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch orders: {str(e)}"
        )


@router.patch("/update-quantity/{order_id}", response_model=dict)
async def update_order_quantity(
    order_id: str,
    quantity: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update the quantity of a specific order
    """
    try:
        # Validate quantity
        if quantity < 1 or quantity > 99:
            raise HTTPException(
                status_code=400,
                detail="Quantity must be between 1 and 99"
            )
        
        # Find the order
        order = db.query(Order).filter(
            Order.order_id == order_id,
            Order.user_id == current_user.id
        ).first()
        
        if not order:
            raise HTTPException(
                status_code=404,
                detail="Order not found"
            )
        
        # Check if order can be modified - FIXED: Use lowercase enum values
        if order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot modify {order.status.value} orders"
            )
        
        # Update quantity
        old_quantity = order.quantity if hasattr(order, 'quantity') else 1
        order.quantity = quantity
        order.updated_at = datetime.now()
        
        db.commit()
        db.refresh(order)
        
        return {
            "success": True,
            "message": "Quantity updated successfully",
            "order_id": order.order_id,
            "old_quantity": old_quantity,
            "new_quantity": order.quantity
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating quantity: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update quantity: {str(e)}"
        )


@router.delete("/delete/{order_id}", response_model=dict)
async def delete_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a specific order
    """
    try:
        # Find the order
        order = db.query(Order).filter(
            Order.order_id == order_id,
            Order.user_id == current_user.id
        ).first()
        
        if not order:
            raise HTTPException(
                status_code=404,
                detail="Order not found"
            )
        
        # Optional: Check if order can be deleted - FIXED: Use lowercase enum value
        if order.status == OrderStatus.COMPLETED:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete completed orders"
            )
        
        # Delete associated prescription image if exists
        if order.prescription_image:
            image_path = Path(order.prescription_image)
            if image_path.exists():
                try:
                    image_path.unlink()
                    print(f"Deleted prescription image: {image_path}")
                except Exception as e:
                    print(f"Failed to delete image file: {e}")
        
        # Store order info before deletion
        deleted_order_id = order.order_id
        deleted_medication_name = order.medication_name
        
        # Delete the order
        db.delete(order)
        db.commit()
        
        return {
            "success": True,
            "message": "Order deleted successfully",
            "order_id": deleted_order_id,
            "medication_name": deleted_medication_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting order: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete order: {str(e)}"
        )


@router.get("/user/{user_id}", response_model=dict)
async def get_user_orders(
    user_id: str,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all orders for a specific user (admin only or own orders)
    """
    # Ensure user can only access their own orders (unless admin)
    if current_user.id != user_id:
        # Check if user is admin
        if not hasattr(current_user, 'is_admin') or not current_user.is_admin:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to view these orders"
            )
    
    # Query database for user orders
    orders = (
        db.query(Order)
        .filter(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    total_orders = db.query(Order).filter(Order.user_id == user_id).count()
    
    return {
        "user_id": user_id,
        "total_orders": total_orders,
        "orders": [
            {
                "order_id": order.order_id,
                "medication_name": order.medication_name,
                "prescription_image": order.prescription_image,
                "quantity": order.quantity if hasattr(order, 'quantity') else 1,
                "status": order.status.value if hasattr(order.status, 'value') else order.status,
                "created_at": order.created_at.isoformat(),
                "updated_at": order.updated_at.isoformat()
            }
            for order in orders
        ]
    }