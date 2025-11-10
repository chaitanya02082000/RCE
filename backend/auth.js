import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/db.js";
import * as dotenv from "dotenv";

dotenv.config();

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
      // ✅ Dynamic redirect URI for production
      redirectURI: `${process.env.BASE_URL || "http://localhost:3000"}/api/auth/callback/google`,
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
  trustedOrigins: [process.env.FRONTEND_URL, "http://localhost:5173"].filter(
    Boolean,
  ),
  baseURL: process.env.BASE_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  advanced: {
    cookieSameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    cookieSecure: process.env.NODE_ENV === "production",
    clearSessionTokenOnSignOut: true,
    useSecureCookies: process.env.NODE_ENV === "production",
  },
});
