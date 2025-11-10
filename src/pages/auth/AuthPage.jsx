import { useParams } from "react-router-dom";
import { AuthView } from "@daveyplate/better-auth-ui";

export default function AuthPage() {
  const { pathname } = useParams();

  console.log("📄 AuthPage - pathname:", pathname);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <main className="container mx-auto flex flex-col items-center justify-center gap-3 p-4 md:p-6">
        <AuthView pathname={pathname} />
      </main>
    </div>
  );
}
