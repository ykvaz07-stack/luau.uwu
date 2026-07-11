import dotenv from "dotenv";
export function loadEnv() {
    dotenv.config();
    const required = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    ];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.warn(`[WARN] Missing environment variables: ${missing.join(", ")}.\n` +
            `This will likely cause runtime errors.`);
    }
}
//# sourceMappingURL=dotenv.js.map