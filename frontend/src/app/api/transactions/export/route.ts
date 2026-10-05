import { withAuth } from "@/lib/http";
import { exportTransactions } from "@/lib/repositories/transactions";

export const GET = withAuth("transactions.import_export", async (req, _ctx, user) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") as "income" | "expense" | null;
  const categoryId = url.searchParams.get("categoryId");
  const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
  const dateTo = url.searchParams.get("dateTo") ?? undefined;

  const rows = await exportTransactions(user.id, {
    type: type ?? undefined,
    categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
    dateFrom,
    dateTo,
  });

  const csvHeader = "date,type,category,amount,note\n";
  const csvBody = rows
    .map((r) =>
      [
        r.transactionDate,
        r.type,
        `"${r.categoryName.replace(/"/g, '""')}"`,
        r.amount,
        r.note ? `"${r.note.replace(/"/g, '""')}"` : "",
      ].join(","),
    )
    .join("\n");

  const csv = csvHeader + csvBody;
  const filename = `transactions_${new Date().toISOString().split("T")[0]}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
