import { NextResponse } from "next/server";
import { withAuth } from "@/lib/http";
import {
  getMonthlySummary,
  getTopExpenseCategories,
  getDailyTotals,
  getDashboardBudgetAlerts,
} from "@/lib/repositories/dashboard";

export const GET = withAuth("dashboard.view_own", async (req, _ctx, user) => {
  const url = new URL(req.url);
  const now = new Date();
  const year = parseInt(url.searchParams.get("year") ?? String(now.getFullYear()), 10);
  const month = parseInt(url.searchParams.get("month") ?? String(now.getMonth() + 1), 10);

  const [summary, topCategories, dailyTotals, budgetAlerts] = await Promise.all([
    getMonthlySummary(user.id, year, month),
    getTopExpenseCategories(user.id, year, month, 5),
    getDailyTotals(user.id, year, month),
    getDashboardBudgetAlerts(user.id),
  ]);

  return NextResponse.json({
    summary,
    topCategories,
    dailyTotals,
    budgetAlerts,
  });
});
