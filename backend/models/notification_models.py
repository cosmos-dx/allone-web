"""
Notification-related Pydantic models
"""
from pydantic import BaseModel

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "info"  # info, warning, error, success
    read: bool = False

class Notification(BaseModel):
    notificationId: str
    userId: str
    title: str
    message: str
    type: str
    read: bool
    createdAt: str

