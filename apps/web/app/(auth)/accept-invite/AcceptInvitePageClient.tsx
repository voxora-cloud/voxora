"use client";

import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AcceptInvitePageClient() {
  const { acceptInvite } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAcceptInvite = useCallback(
    async (inviteToken: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await acceptInvite(inviteToken);
        setSuccess(true);
      } catch (err: Error | unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to accept invitation. The link may be expired or invalid.";

        if (
          errorMessage.includes("expired") ||
          errorMessage.includes("invalid")
        ) {
          setSuccess(true);
        } else {
          setError(errorMessage);
          setSuccess(false);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [acceptInvite]
  );

  useEffect(() => {
    if (token) {
      handleAcceptInvite(token);
    } else {
      setError("No invitation token found");
      setSuccess(false);
    }
  }, [token, handleAcceptInvite]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">V</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Voxora Invitation
          </h1>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="text-gray-600">Processing your invitation...</p>
          </div>
        ) : success === true ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-success mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invitation Accepted!
            </h2>
            <p className="text-gray-600 mb-6">
              Your account has been successfully activated. You can now log in
              to access your dashboard.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <Link href="/agent-login" className="w-full">
                <Button variant="default" className="w-full">
                  Go to Login
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/")}
              >
                Return to Homepage
              </Button>
            </div>
          </div>
        ) : success === false ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <XCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex flex-col gap-3 w-full">
              <Link href="/agent-login" className="w-full">
                <Button variant="default" className="w-full">
                  Go to Login
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/")}
              >
                Return to Homepage
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
