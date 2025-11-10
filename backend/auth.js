import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/db.js";
import * as dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

console.log("🔐 Auth Configuration:");
console.log("   BASE_URL:", BASE_URL);
console.log("   FRONTEND_URL:", FRONTEND_URL);
console.log("   IS_PRODUCTION:", IS_PRODUCTION);
console.log(
  "   Cookie Settings: SameSite=",
  IS_PRODUCTION ? "none" : "lax",
  "Secure=",
  IS_PRODUCTION,
);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!process.env.GOOGLE_CLIENT_ID,
      callbackURL: `${BASE_URL}/api/auth/callback/google`,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  trustedOrigins: [
    FRONTEND_URL,
    BASE_URL,
    "http://localhost:5173",
    "http://localhost:3000",
  ].filter(Boolean),
  baseURL: BASE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  // ✅ CRITICAL: Fix cookie configuration for cross-domain
  advanced: {
    // Force SameSite=None for production (cross-domain)
    cookieSameSite: IS_PRODUCTION ? "none" : "lax",
    // Secure must be true when SameSite=None
    cookieSecure: IS_PRODUCTION,
    // Use secure cookies with __Secure- prefix
    useSecureCookies: IS_PRODUCTION,
    // Clear tokens on sign out
    clearSessionTokenOnSignOut: true,
    // ✅ Disable CSRF check for cross-domain
    disableCSRFCheck: IS_PRODUCTION,
    // ✅ Don't use cross-subdomain cookies
    crossSubdomainCookie: false,
  },
  // ✅ Override cookie options directly
  cookies: IS_PRODUCTION
    ? {
        sessionToken: {
          name: "better-auth.session_token",
          options: {
            httpOnly: true,
            sameSite: "none",
            secure: true,
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 days
          },
        },
        sessionData: {
          name: "better-auth.session_data",
          options: {
            httpOnly: false,
            sameSite: "none",
            secure: true,
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
          },
        },
      }
    : undefined,
});
