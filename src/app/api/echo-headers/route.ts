import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return NextResponse.json({
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
    headers,
  });
}
