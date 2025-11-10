import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import AuthPage from "./pages/auth/AuthPage";
import OAuthCallback from "./pages/auth/OAuthCallback";
import HomePage from "./pages/HomePage.jsx";
import SnippetsPage from "./pages/SnippetsPage.jsx";
import { useSession } from "@/lib/auth-client";
import { getStoredSession } from "@/lib/auth-wrapper";
import React, { useEffect, useState } from "react";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/auth/:pathname" element={<AuthRoute />} />
        {/* ✅ OAuth callback route */}
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/dashboard" element={<ProtectedDashboard />} />
        <Route path="/snippets" element={<ProtectedSnippets />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

function RootRoute() {
  const { data: session, isPending } = useSession();
  const [storedSession, setStoredSession] = useState(null);

  useEffect(() => {
    const stored = getStoredSession();
    setStoredSession(stored);
    console.log(
      "🏠 RootRoute - Cookie Session:",
      !!session,
      "Stored Session:",
      !!stored,
    );
  }, [session]);

  if (isPending) {
    return <LoadingScreen />;
  }

  const hasSession = session || storedSession;

  return hasSession ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Navigate to="/auth/sign-in" replace />
  );
}

function AuthRoute() {
  const { data: session, isPending } = useSession();
  const [storedSession, setStoredSession] = useState(null);

  useEffect(() => {
    const stored = getStoredSession();
    setStoredSession(stored);
    console.log(
      "🔐 AuthRoute - Cookie Session:",
      !!session,
      "Stored Session:",
      !!stored,
    );

    if (stored && !session) {
      console.log("✅ Found stored session, redirecting to dashboard");
      window.location.href = "/dashboard";
    }
  }, [session]);

  if (isPending) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  const hasSession = session || storedSession;

  if (hasSession) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthPage />;
}

function ProtectedDashboard() {
  const { data: session, isPending } = useSession();
  const [storedSession, setStoredSession] = useState(null);

  useEffect(() => {
    const stored = getStoredSession();
    setStoredSession(stored);
    console.log(
      "📊 Dashboard - Cookie Session:",
      !!session,
      "Stored Session:",
      !!stored,
    );
  }, [session]);

  if (isPending) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  const hasSession = session || storedSession;

  if (!hasSession) {
    console.log("❌ No session found, redirecting to sign-in");
    return <Navigate to="/auth/sign-in" replace />;
  }

  return <HomePage />;
}

function ProtectedSnippets() {
  const { data: session, isPending } = useSession();
  const [storedSession, setStoredSession] = useState(null);

  useEffect(() => {
    const stored = getStoredSession();
    setStoredSession(stored);
  }, [session]);

  if (isPending) {
    return <LoadingScreen />;
  }

  const hasSession = session || storedSession;

  if (!hasSession) {
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
