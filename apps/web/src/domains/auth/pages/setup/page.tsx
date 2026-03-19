import { CheckCircle2 } from "lucide-react";
import { SignupForm } from "../../components/signup-form";
import Logo from "@/shared/components/logo";
import { Card } from "@/shared/ui/card";
import { useAuthStore } from "../../store/auth.store";
import { Navigate } from "react-router";

export default function SetupPage() {
  const isAdminRegistered = useAuthStore((state) => state.isAdminRegistered);

  if (isAdminRegistered) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-8">
      <Card className="flex flex-col md:flex-row w-full max-w-[900px] shadow-xl overflow-hidden border-border/50">
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          <SignupForm />
        </div>
        
        <div className="hidden md:flex w-full md:w-1/2 bg-muted/30 flex-col justify-center p-12 border-l border-border/50">
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Logo size={40} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Voxora
              </h2>
            </div>
            
            <p className="text-lg text-muted-foreground mb-8">
              The complete platform for intelligent conversations at scale. Connect with your customers faster and smarter.
            </p>
            
            <div className="space-y-4">
              {[
                "AI-powered intelligent routing",
                "Real-time analytics and reporting",
                "Multi-channel support integrations",
                "Scalable team management",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
      
      <div className="mt-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Voxora. All rights reserved.
      </div>
    </div>
  );
}
