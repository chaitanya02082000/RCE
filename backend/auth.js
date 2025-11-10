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
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5173",
  ],
  baseURL: process.env.BASE_URL || "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "secret-key-min-32-characters-long-required",
  // ✅ This is the key setting!
  redirects: {
    // After successful OAuth, redirect here
    afterSignIn: `${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard`,
    afterSignUp: `${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard`,
    onError: `${process.env.FRONTEND_URL || "http://localhost:5173"}/auth/sign-in`,
  },
  advanced: {
    cookieSameSite: "lax",
    cookieSecure: process.env.NODE_ENV === "production",
    clearSessionTokenOnSignOut: true,
  },
});
