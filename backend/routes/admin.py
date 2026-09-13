from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List

from models.schemas import AdminMetrics, AdminGrantRequest, PaymentReconcileResponse
from database import (
    get_users_collection,
    get_payments_collection,
    get_entitlements_collection,
    get_usages_collection,
    get_audit_logs_collection,
)
from security.auth import require_admin
from services.entitlement import activate_7_day_pass
from services.payment.cashfree import CashfreeService, ASTRA_PASS_AMOUNT_INR, ASTRA_PASS_CURRENCY

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/metrics", response_model=AdminMetrics)
async def get_admin_metrics(admin: dict = Depends(require_admin)):
    """Computes high-level business and operational metrics for Astra SaaS."""
    users_col = get_users_collection()
    payments_col = get_payments_collection()

    total_users = await users_col.count_documents({}) if users_col is not None else 0
    now = datetime.now(timezone.utc)

    # Active premium passes: where access_expires_at > now
    active_premium_users = (
        await users_col.count_documents({"access_expires_at": {"$gt": now}})
        if users_col is not None
        else 0
    )
    free_users = max(0, total_users - active_premium_users)
    expired_passes = (
        await users_col.count_documents({"subscription_status": "EXPIRED"})
        if users_col is not None
        else 0
    )

    total_payments = await payments_col.count_documents({}) if payments_col is not None else 0
    successful_payments = (
        await payments_col.count_documents({"status": "SUCCESS"})
        if payments_col is not None
        else 0
    )
    failed_payments = (
        await payments_col.count_documents({"status": "FAILED"})
        if payments_col is not None
        else 0
    )
    pending_payments = (
        await payments_col.count_documents({"status": "PENDING"})
        if payments_col is not None
        else 0
    )

    # Total revenue strictly calculated from verified successful payments
    total_revenue_inr = successful_payments * ASTRA_PASS_AMOUNT_INR

    return AdminMetrics(
        total_users=total_users,
        free_users=free_users,
        active_premium_users=active_premium_users,
        expired_passes=expired_passes,
        total_revenue_inr=total_revenue_inr,
        total_payments=total_payments,
        successful_payments=successful_payments,
        failed_payments=failed_payments,
        pending_payments=pending_payments,
    )


@router.get("/users")
async def list_users(
    query: Optional[str] = None,
    limit: int = 50,
    admin: dict = Depends(require_admin),
):
    """Searches and lists users with current plan, usage, and pass status."""
    users_col = get_users_collection()
    if users_col is None:
        return []

    filter_dict = {}
    if query:
        filter_dict["email"] = {"$regex": query, "$options": "i"}

    cursor = users_col.find(filter_dict).sort("created_at", -1).limit(limit)
    users_list = []
    now = datetime.now(timezone.utc)

    async for user in cursor:
        expires_at = user.get("access_expires_at")
        is_active = False
        if expires_at and isinstance(expires_at, datetime):
            is_active = expires_at.replace(tzinfo=timezone.utc if not expires_at.tzinfo else None) > now
        elif expires_at and isinstance(expires_at, str):
            try:
                dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                is_active = dt > now
            except Exception:
                is_active = False

        users_list.append({
            "id": str(user.get("_id")),
            "email": user.get("email"),
            "plan": "ASTRA_7_DAY" if is_active else "FREE",
            "subscription_status": user.get("subscription_status", "INACTIVE"),
            "is_active_pass": is_active,
            "access_expires_at": expires_at.isoformat() if isinstance(expires_at, datetime) else expires_at,
            "created_at": user.get("created_at").isoformat() if isinstance(user.get("created_at"), datetime) else "",
        })

    return users_list


@router.post("/entitlement/grant")
async def grant_entitlement(
    request: AdminGrantRequest,
    admin: dict = Depends(require_admin),
):
    """Manual administrative grant of Astra Pass for customer support."""
    result = await activate_7_day_pass(
        user_email=request.email,
        source_payment_id=f"ADMIN_GRANT_{admin.get('email')}",
        days=request.days,
    )

    audit_col = get_audit_logs_collection()
    if audit_col is not None:
        await audit_col.insert_one({
            "action": "ADMIN_MANUAL_GRANT",
            "admin_email": admin.get("email"),
            "target_user": request.email,
            "days": request.days,
            "reason": request.reason,
            "timestamp": datetime.now(timezone.utc),
        })

    return {"message": f"Successfully granted {request.days}-day pass to {request.email}", "entitlement": result}


@router.get("/transactions")
async def list_transactions(
    limit: int = 50,
    admin: dict = Depends(require_admin),
):
    """Lists recent transactions with Cashfree references and statuses."""
    payments_col = get_payments_collection()
    if payments_col is None:
        return []

    cursor = payments_col.find({}).sort("created_at", -1).limit(limit)
    transactions = []

    async for doc in cursor:
        created_at_val = doc.get("created_at")
        verified_at_val = doc.get("verified_at")
        transactions.append({
            "order_id": doc.get("order_id"),
            "link_id": doc.get("link_id"),
            "user_email": doc.get("email") or doc.get("user_id"),
            "amount_inr": float(doc.get("amount", ASTRA_PASS_AMOUNT_INR)),
            "currency": doc.get("currency", ASTRA_PASS_CURRENCY),
            "status": doc.get("status"),
            "provider": doc.get("provider", "cashfree"),
            "payment_link": doc.get("payment_link"),
            "provider_payment_id": doc.get("provider_payment_id"),
            "created_at": created_at_val.isoformat() if isinstance(created_at_val, datetime) else "",
            "verified_at": verified_at_val.isoformat() if isinstance(verified_at_val, datetime) else "",
        })

    return transactions


@router.post("/reconcile/{order_id}", response_model=PaymentReconcileResponse)
async def admin_reconcile_payment(
    order_id: str,
    admin: dict = Depends(require_admin),
):
    """
    Administrative tool to force-reconcile a transaction with Cashfree.
    """
    try:
        result = await CashfreeService.reconcile_payment(order_id)
        return PaymentReconcileResponse(
            order_id=order_id,
            reconciled=result["reconciled"],
            status=result["status"],
            message=result["message"],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
