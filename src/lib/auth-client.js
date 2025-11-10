import { createAuthClient } from "better-auth/react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

console.log("🔧 Auth Client initializing with API URL:", API_URL);

export const authClient = createAuthClient({
  baseURL: API_URL,
  credentials: "include",
  fetchOptions: {
    onError(context) {
      console.error("❌ Auth error:", context.error);
      if (context.error.status === 401) {
        console.log("Unauthorized - session expired");
        // Clear any stale session data
        window.location.href = "/auth/sign-in";
      }
    },
    onSuccess(context) {
      console.log("✅ Auth success");

      // ✅ If this is a sign-in/sign-up, force redirect
      if (context.data?.session || context.data?.user) {
        console.log("🎉 User authenticated, redirecting to dashboard");
        // Small delay to ensure session is saved
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 100);
      }
    },
  },
});

export const { signIn, signUp, useSession, signOut } = authClient;

export const handleSignOut = async (navigate) => {
  try {
    console.log("🚪 Signing out...");
    await signOut();
    // Force full page reload to clear all state
    window.location.href = "/auth/sign-in";
  } catch (error) {
    console.error("Sign out failed:", error);
    window.location.href = "/auth/sign-in";
  }
};
