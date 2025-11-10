import { authClient } from "./auth-client";

// ✅ Helper to store session in localStorage as backup
const SESSION_KEY = "auth_session";

export const storeSession = (session) => {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    console.log("💾 Session stored locally");
  }
};

export const getStoredSession = () => {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const clearStoredSession = () => {
  localStorage.removeItem(SESSION_KEY);
  console.log("🗑️ Session cleared from storage");
};

// ✅ Email Sign Up
export const signUpWithEmail = async (email, password, name) => {
  try {
    const result = await authClient.signUp.email({
      email,
      password,
      name,
    });

    if (result.data) {
      storeSession(result.data);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 100);
    }

    return result;
  } catch (error) {
    console.error("Sign up error:", error);
    throw error;
  }
};

// ✅ Email Sign In
export const signInWithEmail = async (email, password) => {
  try {
    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.data) {
      storeSession(result.data);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 100);
    }

    return result;
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  }
};

// ✅ Google Sign In
export const signInWithGoogle = async () => {
  try {
    console.log("🔵 Starting Google Sign In...");

    // This will redirect to Google OAuth
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/auth/callback",
    });

    return result;
  } catch (error) {
    console.error("Google sign in error:", error);
    throw error;
  }
};

// ✅ Sign Out
export const signOutUser = async () => {
  try {
    await authClient.signOut();
    clearStoredSession();
    window.location.href = "/auth/sign-in";
  } catch (error) {
    console.error("Sign out error:", error);
    clearStoredSession();
    window.location.href = "/auth/sign-in";
  }
};

// ✅ Check if user has valid session
export const checkSession = async () => {
  try {
    const stored = getStoredSession();

    const response = await fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/auth/get-session`,
      {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const data = await response.json();

    if (data.session && data.user) {
      storeSession(data);
      return data;
    }

    if (stored && !data.session) {
      clearStoredSession();
    }

    return stored;
  } catch (error) {
    console.error("Session check error:", error);
    return getStoredSession();
  }
};
