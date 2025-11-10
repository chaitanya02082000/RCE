import { Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import AuthPage from "./pages/auth/AuthPage";
import HomePage from "./pages/HomePage.jsx";
import { useSession } from "@/lib/auth-client";
import React, { useEffect } from "react";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/auth/:pathname" element={<AuthPage />} />
        <Route path="/dashboard" element={<ProtectedDashboard />} />
        {/* ✅ Add OAuth callback route */}
        <Route
          path="/api/auth/callback/:provider"
          element={<OAuthCallback />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

// ✅ OAuth Callback Handler
function OAuthCallback() {
  const { data: session, isPending, error } = useSession();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log(
      "OAuth Callback - Session:",
      session,
      "Pending:",
      isPending,
      "Error:",
      error,
    );

    // If we have a session, redirect to dashboard
    if (!isPending && session) {
      console.log("✅ OAuth successful, redirecting to dashboard");
      window.location.href = "/dashboard";
    }

    // If error or no session after loading, go to sign in
    if (!isPending && !session && error) {
      console.log("❌ OAuth failed, redirecting to sign in");
      window.location.href = "/auth/sign-in";
    }
  }, [session, isPending, error]);

  return <LoadingScreen message="Completing Google Sign In..." />;
}

function RootRoute() {
  const { data: session, isPending } = useSession();

  useEffect(() => {
    console.log("🏠 RootRoute - Session:", session, "Pending:", isPending);
  }, [session, isPending]);

  if (isPending) {
    return <LoadingScreen />;
  }

  return session ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Navigate to="/auth/sign-up" replace />
  );
}

function ProtectedDashboard() {
  const { data: session, isPending } = useSession();

  useEffect(() => {
    console.log("🔐 Dashboard - Session:", session, "Pending:", isPending);
  }, [session, isPending]);

  if (isPending) {
    return <LoadingScreen />;
  }

  if (!session) {
    console.log("❌ No session, redirecting to sign-up");
    return <Navigate to="/auth/sign-up" replace />;
  }

  return <HomePage />;
}

function LoadingScreen({ message = "Loading..." }) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default App;
