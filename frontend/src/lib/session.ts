import { cache } from "react";
import { cookies } from "next/headers";

export type Role = "user" | "admin";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

// Backend (FastAPI) sở hữu session/JWT; ở đây chỉ chuyển tiếp cookie của request
// hiện tại sang backend để xác thực, không tự giải mã JWT trong Next.js.
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as AuthUser;
  } catch {
    return null;
  }
});
