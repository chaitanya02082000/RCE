import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { authClient } from "@/lib/auth-client";
import { useNavigate, NavLink } from "react-router-dom";

export function Providers({ children }) {
  const navigate = useNavigate();

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={(href) => {
        console.log("🚀 Navigate to:", href);
        navigate(href);
      }}
      replace={(href) => {
        console.log("🔄 Replace to:", href);
        navigate(href, { replace: true });
      }}
      onSessionChange={() => {
        console.log("📡 Session changed - reloading session");
      }}
      Link={NavLink}
      basePath="/auth"
      // ✅ Critical: Where to redirect after successful auth
      redirectTo="/dashboard"
      social={{
        providers: ["google"],
      }}
      credentials={{
        forgotPassword: true,
      }}
      signUp={{
        fields: ["name"],
      }}
      nameRequired={true}
    >
      {children}
    </AuthUIProvider>
  );
}
