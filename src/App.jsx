import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import AuthPage from "./pages/auth/AuthPage";
import HomePage from "./pages/HomePage.jsx";
import SnippetsPage from "./pages/SnippetsPage.jsx";
import { useSession } from "@/lib/auth-client";
import React, { useEffect } from "react";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/auth/:pathname" element={<AuthRoute />} />
        <Route path="/dashboard" element={<ProtectedDashboard />} />
        <Route path="/snippets" element={<ProtectedSnippets />} />
        <Route
          path="/api/auth/callback/:provider"
          element={<OAuthCallback />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

// ✅ Root route - check session and redirect
function RootRoute() {
  const { data: session, isPending } = useSession();

  useEffect(() => {
    console.log("🏠 RootRoute - Session:", !!session, "Pending:", isPending);
  }, [session, isPending]);

  if (isPending) {
    return <LoadingScreen />;
  }

  // If logged in, go to dashboard, otherwise go to sign-up
  return session ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Navigate to="/auth/sign-up" replace />
  );
}

// ✅ Auth route - redirect to dashboard if already logged in
function AuthRoute() {
  const { data: session, isPending } = useSession();

  useEffect(() => {
    console.log("🔐 AuthRoute - Session:", !!session, "Pending:", isPending);
  }, [session, isPending]);

  if (isPending) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // ✅ If already logged in, redirect to dashboard
  if (session) {
    console.log("✅ Already logged in, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  // Otherwise show auth page
  return <AuthPage />;
}

// OAuth Callback Handler
function OAuthCallback() {
  const { data: session, isPending, error } = useSession();

  useEffect(() => {
    console.log("OAuth Callback - Session:", !!session, "Pending:", isPending);

    if (!isPending && session) {
      console.log("✅ OAuth successful, redirecting to dashboard");
      window.location.href = "/dashboard";
    }

    if (!isPending && !session && error) {
      console.log("❌ OAuth failed, redirecting to sign in");
      window.location.href = "/auth/sign-in";
    }
  }, [session, isPending, error]);

  return <LoadingScreen message="Completing authentication..." />;
}

// Protected Dashboard
function ProtectedDashboard() {
  const { data: session, isPending } = useSession();

  useEffect(() => {
    console.log("📊 Dashboard - Session:", !!session, "Pending:", isPending);
  }, [session, isPending]);

  if (isPending) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  if (!session) {
    console.log("❌ No session, redirecting to sign-in");
    return <Navigate to="/auth/sign-in" replace />;
  }

  return <HomePage />;
}

// Protected Snippets Page
function ProtectedSnippets() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  return <SnippetsPage />;
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
