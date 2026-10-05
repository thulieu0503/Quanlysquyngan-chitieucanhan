import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { isDuplicateEntry } from "@/lib/db";
import { ApiError, readJson, route } from "@/lib/http";
import { createUser } from "@/lib/repositories/users";
import { parseRegisterInput } from "@/lib/validators/auth";

export const POST = route(async (req) => {
  const parsed = parseRegisterInput(await readJson(req));
  if (!parsed.ok) throw new ApiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", parsed.fields);

  const { name, email, password } = parsed.value;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const id = await createUser({ name, email, passwordHash });
    return NextResponse.json({ data: { id } }, { status: 201 });
  } catch (err) {
    if (isDuplicateEntry(err)) {
      throw new ApiError(409, "EMAIL_TAKEN", "Email đã được đăng ký", { email: "Email đã được đăng ký" });
    }
    throw err;
  }
});
