import { AgentLoginForm } from "@/components/auth/agent-login-form";

export default function AgentLoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AgentLoginForm />
      </div>
    </div>
  );
}
