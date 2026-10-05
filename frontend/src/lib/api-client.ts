export type ApiFailure = {
  code: string;
  message: string;
  fields?: Record<string, string | undefined>;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

async function requestJson<T>(url: string, method: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    if (res.ok) {
      return { ok: true, data: json as T };
    }
    return {
      ok: false,
      error: json?.error ?? { code: "UNKNOWN", message: "Đã xảy ra lỗi, vui lòng thử lại" },
    };
  } catch {
    return { ok: false, error: { code: "NETWORK", message: "Không thể kết nối tới máy chủ" } };
  }
}

export function getJson<T = unknown>(url: string): Promise<ApiResult<T>> {
  return requestJson<T>(url, "GET");
}

export function postJson<T = unknown>(url: string, body: unknown): Promise<ApiResult<T>> {
  return requestJson<T>(url, "POST", body);
}

export function putJson<T = unknown>(url: string, body: unknown): Promise<ApiResult<T>> {
  return requestJson<T>(url, "PUT", body);
}

export function patchJson<T = unknown>(url: string, body: unknown): Promise<ApiResult<T>> {
  return requestJson<T>(url, "PATCH", body);
}

export function deleteJson<T = unknown>(url: string): Promise<ApiResult<T>> {
  return requestJson<T>(url, "DELETE");
}
