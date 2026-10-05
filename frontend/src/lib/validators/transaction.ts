/**
 * ============================================================================
 * MODULE KIỂM TRA DỮ LIỆU GIAO DỊCH (Transaction Validators)
 * ============================================================================
 * File này chứa các hàm kiểm tra tính hợp lệ của dữ liệu giao dịch thu/chi:
 * - categoryId: ID danh mục phải là số nguyên dương.
 * - type: Loại giao dịch ("income" hoặc "expense").
 * - amount: Số tiền (phải > 0, tối đa 99.999.999.999.999 VNĐ).
 * - transactionDate: Ngày diễn ra giao dịch (đúng chuẩn YYYY-MM-DD và ngày thực tế hợp lệ).
 * - note: Ghi chú giao dịch (tùy chọn, tối đa 255 ký tự).
 */

export type TransactionInput = {
  categoryId: number;
  type: "income" | "expense";
  amount: number;
  transactionDate: string;
  note?: string;
};

export type FieldErrors = Partial<Record<string, string>>;
type ParseResult<T> = { ok: true; value: T } | { ok: false; fields: FieldErrors };

/** Ép kiểu an toàn body về Record object */
function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
}

/** Lọc bỏ các trường không có lỗi */
function compact(fields: FieldErrors): FieldErrors | null {
  const entries = Object.entries(fields).filter(([, msg]) => msg);
  return entries.length ? Object.fromEntries(entries) : null;
}

/** Biểu thức chính quy kiểm tra định dạng ngày YYYY-MM-DD */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Kiểm tra ID danh mục: phải là số nguyên dương */
export function validateCategoryId(value: unknown): string | undefined {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return "category_id không hợp lệ";
  return undefined;
}

/** Kiểm tra loại giao dịch: chỉ chấp nhận "income" (thu nhập) hoặc "expense" (chi tiêu) */
export function validateTransactionType(value: unknown): string | undefined {
  if (value !== "income" && value !== "expense") return 'Loại phải là "income" hoặc "expense"';
  return undefined;
}

/** Kiểm tra số tiền: phải là số dương lớn hơn 0 và không vượt quá giới hạn */
export function validateAmount(value: unknown): string | undefined {
  const n = Number(value);
  if (isNaN(n) || n <= 0) return "Số tiền phải lớn hơn 0";
  if (n > 999_999_999_999_99) return "Số tiền vượt quá giới hạn";
  return undefined;
}

/** Kiểm tra ngày giao dịch: đúng định dạng YYYY-MM-DD và phải là ngày thực tế (VD: 2026-02-30 là không hợp lệ) */
export function validateTransactionDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !DATE_RE.test(value)) return "Ngày giao dịch không hợp lệ (YYYY-MM-DD)";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "Ngày giao dịch không tồn tại";
  return undefined;
}

/** Kiểm tra ghi chú: tối đa 255 ký tự */
export function validateNote(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return "Ghi chú không hợp lệ";
  if (value.length > 255) return "Ghi chú tối đa 255 ký tự";
  return undefined;
}

/**
 * Hàm tổng hợp để validate toàn bộ Request Body của API tạo/sửa giao dịch
 * @param body - Dữ liệu JSON gửi lên từ client
 * @returns ParseResult chứa dữ liệu đã làm sạch hoặc danh sách lỗi chi tiết
 */
export function parseTransactionInput(body: unknown): ParseResult<TransactionInput> {
  const b = asRecord(body);
  const errors = compact({
    categoryId: validateCategoryId(b.categoryId),
    type: validateTransactionType(b.type),
    amount: validateAmount(b.amount),
    transactionDate: validateTransactionDate(b.transactionDate),
    note: validateNote(b.note),
  });
  if (errors) return { ok: false, fields: errors };
  return {
    ok: true,
    value: {
      categoryId: Number(b.categoryId),
      type: b.type as "income" | "expense",
      amount: Number(b.amount),
      transactionDate: b.transactionDate as string,
      note: typeof b.note === "string" && b.note ? b.note : undefined,
    },
  };
}

