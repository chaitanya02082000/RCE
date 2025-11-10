import {
  AccountSettingsCards,
  SecuritySettingsCards,
  SessionsCard,
} from "@daveyplate/better-auth-ui";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        {/* Settings Components */}
        <div className="space-y-6">
          <AccountSettingsCards />
          <SecuritySettingsCards />
          <SessionsCard />
        </div>
      </div>
    </div>
  );
}
