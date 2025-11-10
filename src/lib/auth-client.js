import { createAuthClient } from "better-auth/react";

// ✅ Get API URL from environment
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

console.log("🔧 Auth Client Config:", {
  baseURL: API_URL,
  environment: import.meta.env.MODE,
});

export const authClient = createAuthClient({
  baseURL: API_URL,
  credentials: "include",
  fetchOptions: {
    onError(context) {
      console.error("❌ Auth error:", context.error);
      if (context.error.status === 401) {
        console.log("Unauthorized - session expired");
      }
    },
    onSuccess(context) {
      console.log("✅ Auth success");
    },
  },
});

export const { signIn, signUp, useSession, signOut } = authClient;

export const handleSignOut = async (navigate) => {
  try {
    console.log("🚪 Signing out...");
    await signOut();
    window.location.href = "/auth/sign-in";
  } catch (error) {
    console.error("Sign out failed:", error);
    window.location.href = "/auth/sign-in";
  }
};
