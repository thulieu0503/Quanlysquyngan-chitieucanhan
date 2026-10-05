export type CategoryInput = {
  name: string;
  type: "income" | "expense";
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

export function validateCategoryName(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return "Tên danh mục không được để trống";
  if (value.trim().length > 100) return "Tên danh mục tối đa 100 ký tự";
  return undefined;
}

export function validateCategoryType(value: unknown): string | undefined {
  if (value !== "income" && value !== "expense") return 'Loại phải là "income" hoặc "expense"';
  return undefined;
}

export function parseCategoryInput(body: unknown): ParseResult<CategoryInput> {
  const b = asRecord(body);
  const errors = compact({
    name: validateCategoryName(b.name),
    type: validateCategoryType(b.type),
  });
  if (errors) return { ok: false, fields: errors };
  return {
    ok: true,
    value: {
      name: (b.name as string).trim(),
      type: b.type as "income" | "expense",
    },
  };
}

