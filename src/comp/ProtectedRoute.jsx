import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/lib/auth-client";

export function ProtectedRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  if (!session) {
    // ✅ Redirect to sign-up instead of sign-in
    return <Navigate to="/auth/sign-up" replace />;
  }

  return <Outlet />;
}
