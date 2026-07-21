import { NextResponse } from "next/server";


export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    emailService: !!process.env.RESEND_API_KEY,
  });
}
