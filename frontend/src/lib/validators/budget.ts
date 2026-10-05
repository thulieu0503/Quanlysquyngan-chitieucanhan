export type BudgetInput = {
  categoryId: number;
  amountLimit: number;
  periodStart: string;
  periodEnd: string;
};

export type FieldErrors = Partial<Record<string, string>>;
type ParseResult<T> = { ok: true; value: T } | { ok: false; fields: FieldErrors };

function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
}

function compact(fields: FieldErrors): FieldErrors | null {
  const entries = Object.entries(fields).filter(([, msg]) => msg);
  return entries.length ? Object.fromEntries(entries) : null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateDate(value: unknown, fieldLabel: string): string | undefined {
  if (typeof value !== "string" || !DATE_RE.test(value)) return `${fieldLabel} không hợp lệ (YYYY-MM-DD)`;
  if (isNaN(new Date(value).getTime())) return `${fieldLabel} không tồn tại`;
  return undefined;
}

export function parseBudgetInput(body: unknown): ParseResult<BudgetInput> {
  const b = asRecord(body);
  const categoryId = Number(b.categoryId);
  const amountLimit = Number(b.amountLimit);
  const periodStart = b.periodStart as string;
  const periodEnd = b.periodEnd as string;

  const errors = compact({
    categoryId: !Number.isInteger(categoryId) || categoryId <= 0 ? "category_id không hợp lệ" : undefined,
    amountLimit: isNaN(amountLimit) || amountLimit <= 0 ? "Hạn mức phải lớn hơn 0" : undefined,
    periodStart: validateDate(b.periodStart, "Ngày bắt đầu"),
    periodEnd: validateDate(b.periodEnd, "Ngày kết thúc"),
    period:
      !validateDate(b.periodStart, "") && !validateDate(b.periodEnd, "") && periodEnd < periodStart
        ? "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu"
        : undefined,
  });
  if (errors) return { ok: false, fields: errors };
  return { ok: true, value: { categoryId, amountLimit, periodStart, periodEnd } };
}

export type BudgetUpdateInput = Omit<BudgetInput, "categoryId">;

export function parseBudgetUpdateInput(body: unknown): ParseResult<BudgetUpdateInput> {
  const b = asRecord(body);
  const amountLimit = Number(b.amountLimit);
  const periodStart = b.periodStart as string;
  const periodEnd = b.periodEnd as string;

  const errors = compact({
    amountLimit: isNaN(amountLimit) || amountLimit <= 0 ? "Hạn mức phải lớn hơn 0" : undefined,
    periodStart: validateDate(b.periodStart, "Ngày bắt đầu"),
    periodEnd: validateDate(b.periodEnd, "Ngày kết thúc"),
    period:
      !validateDate(b.periodStart, "") && !validateDate(b.periodEnd, "") && periodEnd < periodStart
        ? "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu"
        : undefined,
  });
  if (errors) return { ok: false, fields: errors };
  return { ok: true, value: { amountLimit, periodStart, periodEnd } };
}

