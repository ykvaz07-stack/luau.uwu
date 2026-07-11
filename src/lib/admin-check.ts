const RATE_LIMIT_EXEMPT_EMAILS = ["hubqoo@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmailsRaw = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
  const adminEmails = adminEmailsRaw.split(",").map((e) => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}

export function isRateLimitExempt(email: string | null | undefined): boolean {
  if (!email) return false;
  return RATE_LIMIT_EXEMPT_EMAILS.includes(email.toLowerCase());
}
