"use client"

import { ReactNode } from "react"
import { useAuth } from "@/components/auth/auth-context"

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  
  // Authentication checks
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-primary-foreground">V</span>
          </div>
          <div className="text-lg font-medium">Loading...</div>
        </div>
      </div>
    )
  }
  
  // Auth check - redirect if not authenticated or not agent
  if (!isAuthenticated || (user?.role !== 'agent' && user?.role !== 'admin' && user?.role !== 'founder')) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return null
  }

  return (
    <div className="h-full flex">
      {/* Main Content Area */}
      {children}
    </div>
  )
}
