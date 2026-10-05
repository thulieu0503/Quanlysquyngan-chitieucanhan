import { withAuth, ApiError } from "@/lib/http";
import { getTransactionsForExport } from "@/lib/repositories/reports";

export const GET = withAuth("transactions.import_export", async (req, _ctx, user) => {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "csv";
  const year = parseInt(url.searchParams.get("year") ?? "", 10);
  const month = parseInt(url.searchParams.get("month") ?? "", 10);

  if (isNaN(year) || year < 2000 || year > 2100) {
    throw new ApiError(400, "INVALID_PARAM", "Tham số year không hợp lệ");
  }
  if (isNaN(month) || month < 1 || month > 12) {
    throw new ApiError(400, "INVALID_PARAM", "Tham số month phải từ 1 đến 12");
  }
  if (format !== "csv") {
    throw new ApiError(400, "UNSUPPORTED_FORMAT", "Hiện chỉ hỗ trợ format=csv");
  }

  const rows = await getTransactionsForExport(user.id, year, month);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const csvHeader = "date,type,category,amount,note\n";
  const csvBody = rows
    .map((r) =>
      [
        r.date,
        r.type,
        `"${r.categoryName.replace(/"/g, '""')}"`,
        r.amount,
        r.note ? `"${r.note.replace(/"/g, '""')}"` : "",
      ].join(","),
    )
    .join("\n");

  return new Response(csvHeader + csvBody, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report_${monthStr}.csv"`,
    },
  });
});
