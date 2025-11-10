import { useState } from "react";
import { Code } from "@/comp/code";
import { Combobox } from "@/comp/dropdown";
import { ModeToggle } from "@/comp/mode-toggle";
import { UserButton } from "@daveyplate/better-auth-ui";
import { useSession, handleSignOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const { data: session } = useSession();
  const navigate = useNavigate();

  const onSignOut = () => {
    handleSignOut(navigate);
  };

  return (
    <div className="container mx-auto p-4 h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Code Executor</h1>
          {session?.user && (
            <p className="text-sm text-muted-foreground">
              Welcome back, {session.user.name || session.user.email}!
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Combobox value={selectedLanguage} onChange={setSelectedLanguage} />
          <ModeToggle />
          <UserButton size="icon" />
          {/* ✅ Manual sign out button for testing */}
          <Button
            variant="outline"
            size="icon"
            onClick={onSignOut}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        <Code
          prop="Enter your code here..."
          selectedLanguage={selectedLanguage}
        />
      </div>
    </div>
  );
}
