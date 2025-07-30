"use client"

import { useAuth } from "@/components/auth/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestAuthPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  if (isLoading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Auth Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}
          </div>
          {user && (
            <div className="space-y-2">
              <div><strong>Name:</strong> {user.name}</div>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>Role:</strong> {user.role}</div>
            </div>
          )}
          {isAuthenticated && (
            <Button onClick={logout} variant="outline">
              Logout
            </Button>
          )}
          {!isAuthenticated && (
            <Button onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
