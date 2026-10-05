import { NextResponse } from "next/server";
import { withAuth } from "@/lib/http";
import { listAuditLogs } from "@/lib/repositories/audit-logs";

export const GET = withAuth("audit_logs.view", async (req, _ctx, _user) => {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const action = url.searchParams.get("action") ?? undefined;
  const targetTable = url.searchParams.get("targetTable") ?? undefined;
  const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
  const dateTo = url.searchParams.get("dateTo") ?? undefined;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));

  const result = await listAuditLogs({
    userId: userId ? parseInt(userId, 10) : undefined,
    action,
    targetTable,
    dateFrom,
    dateTo,
    page,
    limit,
  });

  return NextResponse.json(result);
});

