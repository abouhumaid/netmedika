from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.order_route import router as order_router
from routes.auth_route import router as auth_router

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace with specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(order_router)