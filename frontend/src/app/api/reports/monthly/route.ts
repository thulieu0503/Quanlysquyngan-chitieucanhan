import { NextResponse } from "next/server";
import { withAuth, ApiError } from "@/lib/http";
import { getMonthlyReport } from "@/lib/repositories/reports";

export const GET = withAuth("transactions.view_own", async (req, _ctx, user) => {
  const url = new URL(req.url);
  const year = parseInt(url.searchParams.get("year") ?? "", 10);
  const month = parseInt(url.searchParams.get("month") ?? "", 10);

  if (isNaN(year) || year < 2000 || year > 2100) {
    throw new ApiError(400, "INVALID_PARAM", "Tham số year không hợp lệ");
  }
  if (isNaN(month) || month < 1 || month > 12) {
    throw new ApiError(400, "INVALID_PARAM", "Tham số month phải từ 1 đến 12");
  }

  const report = await getMonthlyReport(user.id, year, month);
  return NextResponse.json(report);
});
