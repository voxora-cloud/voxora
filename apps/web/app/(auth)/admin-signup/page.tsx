import { AdminOnboarding } from "@/components/auth/founder-onboarding";

export default function AdminSignupPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AdminOnboarding />
      </div>
    </div>
  );
}
