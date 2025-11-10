import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/db.js";
import * as dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

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
      // ✅ CRITICAL: Explicit callback URL
      callbackURL: `${BASE_URL}/api/auth/callback/google`,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  // ✅ Trusted origins for CORS
  trustedOrigins: [
    FRONTEND_URL,
    BASE_URL,
    "http://localhost:5173",
    "http://localhost:3000",
  ].filter(Boolean),

  // ✅ Base URL
  baseURL: BASE_URL,

  // ✅ Secret
  secret: process.env.BETTER_AUTH_SECRET || "development-secret-min-32-chars",

  // ✅ Advanced options for production
  advanced: {
    cookieSameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    cookieSecure: process.env.NODE_ENV === "production",
    clearSessionTokenOnSignOut: true,
    useSecureCookies: process.env.NODE_ENV === "production",
    generateSessionToken: () => {
      return require("crypto").randomBytes(32).toString("hex");
    },
  },
});

console.log("✅ Better Auth initialized:");
console.log("   Base URL:", BASE_URL);
console.log("   Frontend URL:", FRONTEND_URL);
console.log(
  "   Google OAuth Callback:",
  `${BASE_URL}/api/auth/callback/google`,
);
console.log("   Environment:", process.env.NODE_ENV || "development");
