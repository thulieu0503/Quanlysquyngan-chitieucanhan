import { NextResponse } from "next/server";
import { withAuth, readJson, ApiError } from "@/lib/http";
import { updateProfile } from "@/lib/repositories/users";
import { parseProfileUpdateInput } from "@/lib/validators/user";

export const GET = withAuth("transactions.view_own", async (_req, _ctx, user) => {
  return NextResponse.json({ data: user });
});

export const PATCH = withAuth("transactions.view_own", async (req, _ctx, user) => {
  const body = await readJson(req);
  const parsed = parseProfileUpdateInput(body);
  if (!parsed.ok) throw new ApiError(422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", parsed.fields);

  await updateProfile(user.id, parsed.value.name);
  return NextResponse.json({ message: "Cập nhật thành công" });
});
