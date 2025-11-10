import { createAuthClient } from "better-auth/react";

// ✅ Create ONE client instance with proper config
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  credentials: "include",
  // Add fetchOptions for better error handling
  fetchOptions: {
    onError(context) {
      console.error("Auth error:", context.error);
      if (context.error.status === 401) {
        console.log("Unauthorized - session expired");
        // Clear local session on 401
        window.location.href = "/auth/sign-in";
      }
    },
    onSuccess(context) {
      console.log("Auth success:", context.data);
    },
  },
});

// ✅ Export hooks and methods from the SAME instance
export const { signIn, signUp, useSession, signOut } = authClient;

// ✅ Custom sign out with navigation
export const handleSignOut = async (navigate) => {
  try {
    console.log("🚪 Signing out...");
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          console.log("✅ Sign out successful");
          // Force reload to clear all state
          window.location.href = "/auth/sign-in";
        },
        onError: (error) => {
          console.error("❌ Sign out error:", error);
          // Even if there's an error, redirect to sign in
          window.location.href = "/auth/sign-in";
        },
      },
    });
  } catch (error) {
    console.error("Sign out failed:", error);
    // Force redirect even on error
    window.location.href = "/auth/sign-in";
  }
};
