from datetime import date

import aiomysql
from fastapi import APIRouter, Depends, Request

from app.db import get_db
from app.deps import AuthUser, require_action
from app.repositories import reports as reports_repo

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
async def get_dashboard(
    request: Request,
    user: AuthUser = Depends(require_action("dashboard.view_own")),
    conn: aiomysql.Connection = Depends(get_db),
):
    today = date.today()
    q = request.query_params
    year = int(q.get("year") or today.year)
    month = int(q.get("month") or today.month)

    # Run sequentially: all four queries share one pooled connection for this request
    # (a single MySQL connection can't run overlapping queries concurrently).
    summary = await reports_repo.get_monthly_summary(conn, user.id, year, month)
    top_categories = await reports_repo.get_top_expense_categories(conn, user.id, year, month, 5)
    daily_totals = await reports_repo.get_daily_totals(conn, user.id, year, month)
    budget_alerts = await reports_repo.get_dashboard_budget_alerts(conn, user.id)

    return {
        "summary": summary,
        "topCategories": top_categories,
        "dailyTotals": daily_totals,
        "budgetAlerts": budget_alerts,
    }
