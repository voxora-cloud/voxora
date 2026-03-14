import { authApi } from "@/domains/auth/api/auth.api";
import { OwnerDashboard } from "../components/owner-dashboard";
import { AdminDashboard } from "../components/admin-dashboard";
import { AgentDashboard } from "../components/agent-dashboard";
import { Loader } from "@/shared/ui/loader";

export function DashboardHomePage() {
  const role = authApi.getOrgRole();

  if (!role) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader size="lg" />
      </div>
    );
  }

  // Show dashboard based on role
  if (role === "owner") {
    return <OwnerDashboard />;
  }

  if (role === "admin") {
    return <AdminDashboard />;
  }

  if (role === "agent") {
    return <AgentDashboard />;
  }

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">Unknown role: {role}</p>
    </div>
  );
}
