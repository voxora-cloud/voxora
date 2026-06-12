
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/domains/auth/hooks";
import { authApi } from "@/domains/auth/api/auth.api";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "agent" | "founder";
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = "/auth/login",
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate(redirectTo);
        return;
      }

      if (requiredRole) {
        // Check if user has required role or compatible role
        const orgRole = authApi.getOrgRole();
        const userRole = orgRole === "owner" ? "founder" : orgRole;

        const hasRequiredRole =
          userRole === requiredRole ||
          (requiredRole === "admin" && userRole === "founder") ||
          (requiredRole === "agent" && userRole === "admin") ||
          (requiredRole === "agent" && userRole === "founder");

        if (!hasRequiredRole) {
          // Redirect based on user role
          if (userRole === "admin" || userRole === "founder") {
            navigate("/admin");
          } else if (userRole === "agent") {
            navigate("/conversation/inbox");
          } else {
            navigate("/auth/login");
          }
        }
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRole, redirectTo, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-primary-foreground">
              V
            </span>
          </div>
          <div className="text-lg font-medium">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
