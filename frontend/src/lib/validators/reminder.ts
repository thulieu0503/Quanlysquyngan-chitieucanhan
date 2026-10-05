export type ReminderInput = {
  categoryId?: number;
  title: string;
  amount?: number;
  recurrence: "daily" | "weekly" | "monthly" | "yearly";
  nextRunDate: string;
  channel: "email" | "in_app" | "both";
  isActive: boolean;
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
const RECURRENCES = ["daily", "weekly", "monthly", "yearly"] as const;
const CHANNELS = ["email", "in_app", "both"] as const;

export function parseReminderInput(body: unknown): ParseResult<ReminderInput> {
  const b = asRecord(body);

  const title = typeof b.title === "string" ? b.title.trim() : "";
  const recurrence = b.recurrence as string;
  const channel = b.channel as string;
  const nextRunDate = b.nextRunDate as string;
  const categoryId = b.categoryId !== undefined && b.categoryId !== null ? Number(b.categoryId) : undefined;
  const amount = b.amount !== undefined && b.amount !== null ? Number(b.amount) : undefined;
  const isActive = b.isActive !== false;

  const errors = compact({
    title: !title ? "Tiêu đề không được để trống" : title.length > 150 ? "Tiêu đề tối đa 150 ký tự" : undefined,
    recurrence: !RECURRENCES.includes(recurrence as typeof RECURRENCES[number])
      ? "Tần suất không hợp lệ (daily/weekly/monthly/yearly)"
      : undefined,
    channel: !CHANNELS.includes(channel as typeof CHANNELS[number])
      ? "Kênh thông báo không hợp lệ (email/in_app/both)"
      : undefined,
    nextRunDate:
      typeof nextRunDate !== "string" || !DATE_RE.test(nextRunDate)
        ? "Ngày nhắc nhở không hợp lệ (YYYY-MM-DD)"
        : undefined,
    categoryId:
      categoryId !== undefined && (!Number.isInteger(categoryId) || categoryId <= 0)
        ? "category_id không hợp lệ"
        : undefined,
    amount: amount !== undefined && (isNaN(amount) || amount <= 0) ? "Số tiền phải lớn hơn 0" : undefined,
  });

  if (errors) return { ok: false, fields: errors };
  return {
    ok: true,
    value: {
      categoryId,
      title,
      amount,
      recurrence: recurrence as ReminderInput["recurrence"],
      nextRunDate,
      channel: channel as ReminderInput["channel"],
      isActive,
    },
  };
}

