"""
Application Configuration
"""
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Firebase Admin
def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        firebase_admin.get_app()
        logger.info("Firebase Admin already initialized")
    except ValueError:
        project_id = os.environ.get('FIREBASE_PROJECT_ID', 'allone-90859')
        try:
            service_account_path = os.environ.get('FIREBASE_SERVICE_ACCOUNT_PATH')
            
            if not service_account_path:
                default_path = ROOT_DIR / 'service-account.json'
                if default_path.exists():
                    service_account_path = str(default_path)
                    logger.info(f"Found service account at default location: {service_account_path}")
            
            if service_account_path and os.path.exists(service_account_path):
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred, {'projectId': project_id})
                logger.info(f"✅ Firebase Admin initialized with service account: {service_account_path}")
            else:
                firebase_admin.initialize_app(options={'projectId': project_id})
                logger.warning("⚠️  Firebase Admin initialized without service account (limited functionality)")
        except Exception as e:
            logger.warning(f"Firebase Admin initialization issue: {e}. Attempting basic initialization.")
            try:
                firebase_admin.initialize_app(options={'projectId': project_id})
            except Exception as e2:
                logger.error(f"Failed to initialize Firebase Admin: {e2}")
                pass

# Initialize Firestore
def initialize_firestore():
    """Initialize Firestore client"""
    try:
        db = firestore.client()
        logger.info("✅ Firestore initialized successfully")
        return db
    except Exception as e:
        logger.warning(f"Firestore initialization failed: {e}. Some features may not work.")
        return None

# Initialize Firebase and Firestore
initialize_firebase()
db = initialize_firestore()

# Environment variables
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', 'your_open_api_key')
# CORS origins - for web frontend
# Note: Mobile apps don't use CORS, but we include common origins
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000,https://allone.co.in').split(',')

# Initialize repositories (will be imported by routes)
from backend.repositories import (
    UserRepository,
    PasswordRepository,
    TOTPRepository,
    SpaceRepository,
    NotificationRepository,
    BillRepository,
)

# Initialize repositories if db is available
if db:
    user_repo = UserRepository(db)
    password_repo = PasswordRepository(db)
    totp_repo = TOTPRepository(db)
    space_repo = SpaceRepository(db)
    notification_repo = NotificationRepository(db)
    bill_repo = BillRepository(db)
else:
    user_repo = None
    password_repo = None
    totp_repo = None
    space_repo = None
    notification_repo = None
    bill_repo = None

