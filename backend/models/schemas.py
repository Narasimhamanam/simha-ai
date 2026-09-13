from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class PlanType(str, Enum):
    FREE = "FREE"
    ASTRA_7_DAY = "ASTRA_7_DAY"


class SubscriptionStatus(str, Enum):
    INACTIVE = "INACTIVE"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"


# ── Chat & Message Schemas ─────────────────────────────────────────

class CreateChatRequest(BaseModel):
    user_email: str
    title: str = "New Chat"


class MessageRequest(BaseModel):
    chat_id: str
    role: str
    content: str


class RenameChatRequest(BaseModel):
    title: str


class ChatRequest(BaseModel):
    user_id: Optional[str] = None
    message: Optional[str] = None
    chat_id: Optional[str] = None
    role: Optional[str] = None
    agent: Optional[str] = None
    query: Optional[str] = None
    file_name: Optional[str] = None
    file_data: Optional[Dict[str, Any]] = None
    doc_context: Optional[str] = None


# ── Image & Productivity Schemas ───────────────────────────────────

class ImageAnalysisRequest(BaseModel):
    image_base64: str
    prompt: str = "Describe this image in detail."
    user_email: Optional[str] = ""


class EmailDraftRequest(BaseModel):
    prompt: str
    sender_name: Optional[str] = ""
    user_email: Optional[str] = ""


class SummarizeUrlRequest(BaseModel):
    url: str
    user_email: Optional[str] = ""


class CalendarEventRequest(BaseModel):
    prompt: str
    sender_name: Optional[str] = ""
    user_email: Optional[str] = ""


# ── Entitlement & Usage Schemas ────────────────────────────────────

class EntitlementInfo(BaseModel):
    plan: str = "FREE"
    subscription_status: str = "INACTIVE"
    access_started_at: Optional[str] = None
    access_expires_at: Optional[str] = None
    days_remaining: int = 0
    is_active: bool = False


class UsageInfo(BaseModel):
    messages_used: int = 0
    messages_limit: int = 10
    documents_used: int = 0
    documents_limit: int = 2
    quota_reached: bool = False
    plan: str = "FREE"
    days_remaining: int = 0


# ── Payment Schemas ────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    email: str
    redirect_url: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None


class PaymentOrderResponse(BaseModel):
    order_id: str
    link_id: Optional[str] = None
    merchant_transaction_id: Optional[str] = None  # Backward compatibility
    amount: float = 99.00
    currency: str = "INR"
    payment_link: str
    checkout_url: str  # For frontend redirect
    status: str = "PENDING"
    provider: str = "cashfree"


class PaymentStatusResponse(BaseModel):
    order_id: str
    link_id: Optional[str] = None
    merchant_transaction_id: Optional[str] = None
    status: str
    amount: float = 99.00
    currency: str = "INR"
    plan: str = "ASTRA_7_DAY"
    access_expires_at: Optional[str] = None
    provider: str = "cashfree"
    provider_payment_id: Optional[str] = None
    verified_at: Optional[str] = None
    message: str = ""


class PaymentReconcileRequest(BaseModel):
    order_id: str


class PaymentReconcileResponse(BaseModel):
    order_id: str
    reconciled: bool
    status: str
    message: str


# ── Admin Schemas ──────────────────────────────────────────────────

class AdminMetrics(BaseModel):
    total_users: int = 0
    free_users: int = 0
    active_premium_users: int = 0
    expired_passes: int = 0
    total_revenue_inr: float = 0.0
    total_payments: int = 0
    successful_payments: int = 0
    failed_payments: int = 0
    pending_payments: int = 0


class AdminGrantRequest(BaseModel):
    email: str
    days: int = 7
    reason: Optional[str] = "Admin manual grant"

