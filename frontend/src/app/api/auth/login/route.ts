import { NextResponse } from "next/server";

import { proxyAuthAndSetCookie } from "@/lib/auth/server";

export async function POST(request: Request) {
  const body = await request.json();
  return proxyAuthAndSetCookie("/api/v1/auth/login", body);
}
