import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { checkSession, storeSession } from "@/lib/auth-wrapper";
import { toast } from "sonner";

export default function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      console.log("🔄 Processing OAuth callback...");

      try {
        // Wait a bit for cookies to be set
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Check session from backend
        const sessionData = await checkSession();

        console.log("Session data:", sessionData);

        if (sessionData?.session || sessionData?.user) {
          console.log("✅ OAuth successful, storing session");
          storeSession(sessionData);
          toast.success("Signed in with Google successfully!");

          // Redirect to dashboard
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 500);
        } else {
          console.error("❌ No session found after OAuth");
          toast.error("Authentication failed. Please try again.");
          navigate("/auth/sign-in");
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
        toast.error("Authentication failed");
        navigate("/auth/sign-in");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">
          Completing Google sign in...
        </p>
      </div>
    </div>
  );
}
