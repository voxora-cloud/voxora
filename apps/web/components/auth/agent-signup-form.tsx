"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserX } from "lucide-react";
import Link from "next/link";

export function AgentSignupForm() {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
            <UserX className="h-6 w-6 text-accent" />
          </div>
        </div>
        <CardTitle className="text-2xl">Agent Registration Closed</CardTitle>
        <CardDescription>
          Agents cannot self-register on Voxora
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Agent accounts must be created by your organization&apos;s administrator. 
            Please contact your admin to receive an invitation link.
          </p>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">What you can do:</p>
            <ul className="text-sm text-muted-foreground space-y-2 text-left list-disc list-inside">
              <li>Ask your admin to send you an invitation</li>
              <li>Check your email for an existing invitation</li>
              <li>Create a company account as an admin instead</li>
            </ul>
          </div>

          <div className="space-y-2 pt-4">
            <Button asChild className="w-full">
              <Link href="/agent-login">
                Back to Login
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/admin-signup">
                Sign up as Admin
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
