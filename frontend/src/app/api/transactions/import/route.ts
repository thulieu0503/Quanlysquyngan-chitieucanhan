import { NextResponse } from "next/server";
import { withAuth, ApiError, getClientIp } from "@/lib/http";
import { bulkCreateTransactions } from "@/lib/repositories/transactions";
import { listCategoriesForUser } from "@/lib/repositories/categories";
import { insertAuditLog } from "@/lib/repositories/audit-logs";

export const POST = withAuth("transactions.import_export", async (req, _ctx, user) => {
  const text = await req.text();
  if (!text.trim()) throw new ApiError(400, "EMPTY_BODY", "File CSV trống");

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new ApiError(400, "INVALID_CSV", "CSV phải có header và ít nhất 1 dòng dữ liệu");

  const header = lines[0].toLowerCase();
  const expectedHeaders = ["date", "type", "category", "amount"];
  for (const h of expectedHeaders) {
    if (!header.includes(h)) {
      throw new ApiError(400, "INVALID_CSV", `CSV thiếu cột "${h}". Header cần: date,type,category,amount,note`);
    }
  }

  const cols = lines[0].split(",").map((c) => c.trim().toLowerCase());
  const idx = {
    date: cols.indexOf("date"),
    type: cols.indexOf("type"),
    category: cols.indexOf("category"),
    amount: cols.indexOf("amount"),
    note: cols.indexOf("note"),
  };

  const categories = await listCategoriesForUser(user.id);
  const catMap = new Map(categories.map((c) => [`${c.name.toLowerCase()}:${c.type}`, c.id]));

  const rows: Parameters<typeof bulkCreateTransactions>[0] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim());
    const date = parts[idx.date] ?? "";
    const type = (parts[idx.type] ?? "").toLowerCase() as "income" | "expense";
    const categoryName = (parts[idx.category] ?? "").toLowerCase();
    const amountStr = parts[idx.amount] ?? "";
    const note = idx.note >= 0 ? (parts[idx.note] ?? "") : "";

    if (!date || !type || !categoryName || !amountStr) {
      errors.push(`Dòng ${i + 1}: thiếu dữ liệu bắt buộc`);
      continue;
    }
    if (type !== "income" && type !== "expense") {
      errors.push(`Dòng ${i + 1}: type phải là income hoặc expense`);
      continue;
    }
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Dòng ${i + 1}: amount phải là số dương`);
      continue;
    }
    const categoryId = catMap.get(`${categoryName}:${type}`);
    if (!categoryId) {
      errors.push(`Dòng ${i + 1}: không tìm thấy danh mục "${parts[idx.category]}" (${type})`);
      continue;
    }
    rows.push({ userId: user.id, categoryId, type, amount, transactionDate: date, note: note || undefined });
  }

  if (errors.length > 0 && rows.length === 0) {
    throw new ApiError(422, "IMPORT_FAILED", `Import thất bại: ${errors.slice(0, 5).join("; ")}`);
  }

  const inserted = rows.length > 0 ? await bulkCreateTransactions(rows) : 0;

  await insertAuditLog({
    userId: user.id,
    action: "transactions.import",
    targetTable: "transactions",
    detail: { inserted, errors: errors.length },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ inserted, skipped: errors.length, errors: errors.slice(0, 20) }, {
    status: inserted > 0 ? 201 : 422,
  });
});
