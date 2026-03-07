"use client";

import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Loader } from "@/components/ui/loader";
import { apiService } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AcceptInvitePageClient() {
  const { acceptInvite } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<{ email: string; name: string; requiresPassword: boolean; organization: any } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleAcceptInvite = useCallback(
    async (inviteToken: string, userPassword?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await acceptInvite(inviteToken, userPassword);
        setSuccess(true);
      } catch (err: Error | unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to accept invitation. The link may be expired or invalid.";

        setError(errorMessage);

        // Check if invitation was already accepted
        if (errorMessage.includes("already been accepted")) {
          setAlreadyAccepted(true);
        }

        setSuccess(false);
      } finally {
        setIsLoading(false);
      }
    },
    [acceptInvite]
  );

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("No invitation token found");
        setSuccess(false);
        return;
      }

      try {
        setIsLoading(true);
        const res = await apiService.verifyInvite(token);
        if (res.success && res.data) {
          setInviteDetails(res.data);

          // If no password is required, accept immediately to save the user a click!
          if (!res.data.requiresPassword) {
            handleAcceptInvite(token);
          } else {
            setIsLoading(false); // Only stop loading if we need to show the UI
          }
        }
      } catch (err: any) {
        setIsLoading(false);
        setError(err.message || "Failed to verify invitation. The link may be expired or invalid.");
        setSuccess(false);
      }
    };

    verifyToken();
  }, [token, handleAcceptInvite]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md p-8 shadow-xl border-border">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">V</span>
          </div>
          <h1 className="text-2xl font-bold mb-1 text-foreground">
            Voxora Invitation
          </h1>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-4">
              <Loader size="md" />
            </div>
            <p className="text-muted-foreground">Processing your invitation...</p>
          </div>
        ) : success === true ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-success mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-foreground">
              Invitation Accepted!
            </h2>
            <p className="text-muted-foreground mb-6">
              Your account has been successfully activated. You can now log in
              to access your dashboard.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <Link href="/login" className="w-full">
                <Button variant="default" className="w-full cursor-pointer">
                  Go to Login
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full cursor-pointer"
                onClick={() => router.push("/")}
              >
                Return to Homepage
              </Button>
            </div>
          </div>
        ) : success === false ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            {alreadyAccepted ? (
              <>
                <AlertCircle className="h-16 w-16 text-info mb-4" />
                <h2 className="text-xl font-semibold mb-2 text-foreground">
                  Already Accepted
                </h2>
                <p className="text-muted-foreground mb-4">{error}</p>
                <div className="bg-info/10 border border-info/30 rounded-lg p-4 mb-6">
                  <p className="text-sm">
                    This invitation has already been activated. You can now log in to your account using your credentials.
                  </p>
                </div>
                <div className="flex flex-col gap-3 w-full">
                  <Link href="/login" className="w-full">
                    <Button variant="default" className="w-full cursor-pointer">
                      Go to Login
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full cursor-pointer"
                    onClick={() => router.push("/")}
                  >
                    Return to Homepage
                  </Button>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 text-destructive mb-4" />
                <h2 className="text-xl font-semibold mb-2 text-foreground">
                  {error?.includes("expired") ? "Invitation Expired" : "Something went wrong"}
                </h2>
                <p className="text-muted-foreground mb-6">{error}</p>
                {error?.includes("expired") && (
                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-4">
                    <p className="text-sm text-warning">
                      This invitation was valid for 7 days and has now expired.
                      Please contact your administrator to request a new invitation.
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-3 w-full">
                  <Link href="/login" className="w-full">
                    <Button variant="default" className="w-full cursor-pointer">
                      Go to Login
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full cursor-pointer"
                    onClick={() => router.push("/")}
                  >
                    Return to Homepage
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : inviteDetails?.requiresPassword ? (
          <div className="flex flex-col gap-5 mt-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground">Complete Your Account</h2>
              <p className="text-sm text-muted-foreground mt-1">
                You have been invited by <span className="font-medium text-foreground">{inviteDetails.organization.name}</span>. Set a password to activate your account.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={inviteDetails.email} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <Button
              className="w-full mt-2"
              onClick={() => handleAcceptInvite(token!, password)}
              disabled={!password || password !== confirmPassword || password.length < 8}
            >
              Accept Invitation & Join
            </Button>
            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive text-center">Passwords do not match.</p>
            )}
            {password && password.length < 8 && password === confirmPassword && (
              <p className="text-xs text-muted-foreground text-center">Password must be at least 8 characters.</p>
            )}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
