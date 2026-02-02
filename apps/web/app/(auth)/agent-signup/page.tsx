import { AgentSignupForm } from "@/components/auth/agent-signup-form";

export default function AgentSignupPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AgentSignupForm />
      </div>
    </div>
  );
}
