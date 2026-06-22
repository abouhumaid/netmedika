from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from controllers.order_route import router as order_router
from controllers.auth_route import router as auth_router
from controllers.profile_route import router as profile_router
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.mount('/uploads', StaticFiles(directory='uploads'), name='uploads')

# Configure CORS 
cors_origins_str = os.getenv("CORS_ORIGINS", "")
if cors_origins_str:
    origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]
else:
    origins = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"] # Safe defaults for dev

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(order_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
