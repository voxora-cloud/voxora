"use client";

import { useAuth } from "@/components/auth/auth-context";
import { useEffect, ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "agent" | "founder";
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        window.location.href = redirectTo;
        return;
      }

      if (requiredRole) {
        // Check if user has required role or compatible role
        const hasRequiredRole =
          user?.role === requiredRole ||
          (requiredRole === "admin" && user?.role === "founder") ||
          (requiredRole === "agent" && user?.role === "admin") ||
          (requiredRole === "agent" && user?.role === "founder");

        if (!hasRequiredRole) {
          // Redirect based on user role
          if (user?.role === "admin" || user?.role === "founder") {
            window.location.href = "/admin";
          } else if (user?.role === "agent") {
            window.location.href = "/dashboard";
          } else {
            window.location.href = "/login";
          }
        }
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRole, redirectTo]);

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
