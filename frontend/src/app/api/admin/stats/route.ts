import { NextResponse } from "next/server";
import { withAuth } from "@/lib/http";
import { getSystemStats } from "@/lib/repositories/reports";

export const GET = withAuth("stats.view_system", async (_req, _ctx, _user) => {
  const stats = await getSystemStats();
  return NextResponse.json(stats);
});
