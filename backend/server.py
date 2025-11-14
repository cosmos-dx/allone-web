from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import firebase_admin
from firebase_admin import credentials, auth
import pyotp
import qrcode
from io import BytesIO
import base64
from cryptography.fernet import Fernet
import jwt
from openai import OpenAI
import asyncio
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize Firebase Admin (if not already initialized)
try:
    firebase_admin.get_app()
except ValueError:
    # Use default credentials or service account
    firebase_admin.initialize_app()

# OpenAI client
openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY', 'your_open_api_key'))

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    userId: str
    email: str
    displayName: Optional[str] = None
    photoURL: Optional[str] = None
    createdAt: str
    lastLogin: str
    passkeyEnabled: bool = False
    preferences: Optional[Dict] = {}

class SessionCreate(BaseModel):
    idToken: str

class SessionResponse(BaseModel):
    sessionToken: str
    user: User

class PasswordCreate(BaseModel):
    spaceId: str = "personal"
    encryptedPassword: str
    displayName: str
    username: Optional[str] = None
    website: Optional[str] = None
    category: Optional[str] = "Other"
    tags: List[str] = []
    notes: Optional[str] = None
    favicon: Optional[str] = None
    strength: Optional[int] = 0

class Password(BaseModel):
    model_config = ConfigDict(extra="ignore")
    passwordId: str
    userId: str
    spaceId: str
    encryptedPassword: str
    displayName: str
    username: Optional[str] = None
    website: Optional[str] = None
    category: str
    tags: List[str]
    notes: Optional[str] = None
    favicon: Optional[str] = None
    strength: int
    createdAt: str
    updatedAt: str
    lastUsed: Optional[str] = None

class TOTPCreate(BaseModel):
    spaceId: str = "personal"
    serviceName: str
    account: str
    encryptedSecret: str
    algorithm: str = "SHA1"
    digits: int = 6
    period: int = 30

class TOTP(BaseModel):
    model_config = ConfigDict(extra="ignore")
    totpId: str
    userId: str
    spaceId: str
    serviceName: str
    account: str
    encryptedSecret: str
    algorithm: str
    digits: int
    period: int
    createdAt: str

class SpaceCreate(BaseModel):
    name: str
    type: str = "personal"  # personal, family, work
    members: List[Dict] = []

class Space(BaseModel):
    model_config = ConfigDict(extra="ignore")
    spaceId: str
    name: str
    type: str
    ownerId: str
    members: List[Dict]
    createdAt: str

class AIQuery(BaseModel):
    query: str
    context: Optional[Dict] = {}

class SearchQuery(BaseModel):
    query: str
    filters: Optional[Dict] = {}

# Middleware to verify Firebase token
async def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.split('Bearer ')[1]
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# Auth endpoints
@api_router.post("/auth/session", response_model=SessionResponse)
async def create_session(session_data: SessionCreate):
    try:
        decoded_token = auth.verify_id_token(session_data.idToken)
        user_id = decoded_token['uid']
        email = decoded_token.get('email')
        
        # Check if user exists
        existing_user = await db.users.find_one({"userId": user_id}, {"_id": 0})
        
        now = datetime.now(timezone.utc).isoformat()
        
        if not existing_user:
            # Create new user
            user_doc = {
                "userId": user_id,
                "email": email,
                "displayName": decoded_token.get('name'),
                "photoURL": decoded_token.get('picture'),
                "createdAt": now,
                "lastLogin": now,
                "passkeyEnabled": False,
                "preferences": {}
            }
            await db.users.insert_one(user_doc)
            
            # Create default personal space
            space_doc = {
                "spaceId": f"space_{uuid.uuid4()}",
                "name": "Personal",
                "type": "personal",
                "ownerId": user_id,
                "members": [],
                "createdAt": now
            }
            await db.spaces.insert_one(space_doc)
        else:
            # Update last login
            await db.users.update_one(
                {"userId": user_id},
                {"$set": {"lastLogin": now}}
            )
        
        # Create session
        session_token = jwt.encode(
            {"userId": user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=24)},
            os.environ.get('JWT_SECRET', 'your-secret-key'),
            algorithm="HS256"
        )
        
        user = await db.users.find_one({"userId": user_id}, {"_id": 0})
        return SessionResponse(sessionToken=session_token, user=User(**user))
        
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@api_router.get("/auth/user", response_model=User)
async def get_current_user(token_data: dict = Depends(verify_token)):
    user = await db.users.find_one({"userId": token_data['uid']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

# Password endpoints
@api_router.post("/passwords", response_model=Password)
async def create_password(password_data: PasswordCreate, token_data: dict = Depends(verify_token)):
    user_id = token_data['uid']
    password_id = f"pwd_{uuid.uuid4()}"
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "passwordId": password_id,
        "userId": user_id,
        **password_data.model_dump(),
        "createdAt": now,
        "updatedAt": now,
        "lastUsed": None
    }
    
    await db.passwords.insert_one(doc)
    return Password(**doc)

@api_router.get("/passwords", response_model=List[Password])
async def get_passwords(spaceId: Optional[str] = None, token_data: dict = Depends(verify_token)):
    user_id = token_data['uid']
    query = {"userId": user_id}
    if spaceId:
        query["spaceId"] = spaceId
    
    passwords = await db.passwords.find(query, {"_id": 0}).to_list(1000)
    return [Password(**pwd) for pwd in passwords]

@api_router.put("/passwords/{password_id}", response_model=Password)
async def update_password(password_id: str, password_data: PasswordCreate, token_data: dict = Depends(verify_token)):
    user_id = token_data['uid']
    
    update_doc = {
        **password_data.model_dump(),
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.passwords.update_one(
        {"passwordId": password_id, "userId": user_id},
        {"$set": update_doc}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Password not found")
    
    updated = await db.passwords.find_one({"passwordId": password_id}, {"_id": 0})
    return Password(**updated)

@api_router.delete("/passwords/{password_id}")
async def delete_password(password_id: str, token_data: dict = Depends(verify_token)):
    user_id = token_data['uid']
    result = await db.passwords.delete_one({"passwordId": password_id, "userId": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Password not found")
    
    return {"message": "Password deleted successfully"}

# TOTP endpoints
@api_router.post("/totp", response_model=TOTP)
async def create_totp(totp_data: TOTPCreate, token_data: dict = Depends(verify_token)):
    user_id = token_data['uid']
    totp_id = f"totp_{uuid.uuid4()}"
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "totpId": totp_id,
        "userId": user_id,
        **totp_data.model_dump(),
        "createdAt": now
    }
    
    await db.totp_secrets.insert_one(doc)
    return TOTP(**doc)

@api_router.get("/totp", response_model=List[TOTP])
async def get_totp_list(spaceId: Optional[str] = None, token_data: dict = Depends(verify_token)):
    user_id = token_data['uid']
    query = {"userId": user_id}
    if spaceId:
        query["spaceId"] = spaceId
    
    totps = await db.totp_secrets.find(query, {"_id": 0}).to_list(1000)
    return [TOTP(**t) for t in totps]

@api_router.delete("/totp/{totp_id}")
async def delete_totp(totp_id: str, token_data: dict = Depends(verify_token)):
    user_id = token_data['uid']
    result = await db.totp_secrets.delete_one({"totpId": totp_id, "userId": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="TOTP not found")
    
    return {"message": "TOTP deleted successfully"}

# Spaces endpoints
@api_router.post("/spaces", response_model=Space)
async def create_space(space_data: SpaceCreate, token_data: dict = Depends(verify_token)):
    user_id = token_data['uid']
    space_id = f"space_{uuid.uuid4()}"
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "spaceId": space_id,
        "ownerId": user_id,
        **space_data.model_dump(),
        "createdAt": now
    }
    
    await db.spaces.insert_one(doc)
    return Space(**doc)

@api_router.get("/spaces", response_model=List[Space])
async def get_spaces(token_data: dict = Depends(verify_token)):
    user_id = token_data['uid']
    spaces = await db.spaces.find({"ownerId": user_id}, {"_id": 0}).to_list(100)
    return [Space(**s) for s in spaces]

# Search endpoint
@api_router.post("/search")
async def search(search_query: SearchQuery, token_data: dict = Depends(verify_token)):
    user_id = token_data['uid']
    query_text = search_query.query.lower()
    
    # Search passwords
    passwords = await db.passwords.find(
        {
            "userId": user_id,
            "$or": [
                {"displayName": {"$regex": query_text, "$options": "i"}},
                {"username": {"$regex": query_text, "$options": "i"}},
                {"website": {"$regex": query_text, "$options": "i"}},
                {"category": {"$regex": query_text, "$options": "i"}}
            ]
        },
        {"_id": 0}
    ).to_list(100)
    
    # Search TOTP
    totps = await db.totp_secrets.find(
        {
            "userId": user_id,
            "$or": [
                {"serviceName": {"$regex": query_text, "$options": "i"}},
                {"account": {"$regex": query_text, "$options": "i"}}
            ]
        },
        {"_id": 0}
    ).to_list(100)
    
    return {
        "passwords": passwords,
        "totps": totps
    }

# AI Assistant endpoint
@api_router.post("/ai/chat")
async def ai_chat(query: AIQuery, token_data: dict = Depends(verify_token)):
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful security assistant for AllOne Password Manager. Help users with password security, best practices, and password management tips. Be concise and friendly."},
                {"role": "user", "content": query.query}
            ],
            max_tokens=500
        )
        
        return {
            "response": response.choices[0].message.content
        }
    except Exception as e:
        return {"response": f"I'm having trouble connecting right now. Error: {str(e)}"}

# AI Password Analysis
@api_router.post("/ai/analyze-passwords")
async def analyze_passwords(token_data: dict = Depends(verify_token)):
    user_id = token_data['uid']
    passwords = await db.passwords.find({"userId": user_id}, {"_id": 0}).to_list(1000)
    
    # Simple analysis
    weak_count = sum(1 for p in passwords if p.get('strength', 0) < 3)
    total_count = len(passwords)
    
    analysis = {
        "totalPasswords": total_count,
        "weakPasswords": weak_count,
        "securityScore": max(0, 100 - (weak_count * 10)),
        "recommendations": []
    }
    
    if weak_count > 0:
        analysis["recommendations"].append(f"You have {weak_count} weak passwords. Consider updating them.")
    
    if total_count > 50:
        analysis["recommendations"].append("Consider organizing your passwords into categories.")
    
    return analysis

@api_router.get("/")
async def root():
    return {"message": "AllOne Password Manager API"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()