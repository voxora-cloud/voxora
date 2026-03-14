import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/ui/card";
import { CheckCircle2, XCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Loader } from "@/shared/ui/loader";
import { Label } from "@/shared/ui/label";
import { useVerifyInvite, useAcceptInvite } from "../../hooks";
import { validatePassword, validatePasswordConfirmation } from "@/shared/lib/validation";

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const { data: verifyData, isLoading: isVerifying, error: verifyError } = useVerifyInvite(token);
  const { mutate: acceptInvite, isPending: isAccepting, isSuccess, isError, error: acceptError } = useAcceptInvite();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [touched, setTouched] = useState(false);

  // Auto-accept if no password required
  useEffect(() => {
    if (verifyData?.success && verifyData.data && !verifyData.data.requiresPassword && token) {
      acceptInvite({ token });
    }
  }, [verifyData, token, acceptInvite]);

  // Redirect after successful acceptance
  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        navigate("/auth/login");
      }, 2000);
    }
  }, [isSuccess, navigate]);

  const handlePasswordBlur = () => {
    setTouched(true);
    if (password) {
      const error = validatePassword(password);
      setFieldErrors((prev) => ({ ...prev, password: error || undefined }));
    }
  };

  const handleConfirmPasswordBlur = () => {
    setTouched(true);
    if (confirmPassword) {
      const error = validatePasswordConfirmation(password, confirmPassword);
      setFieldErrors((prev) => ({ ...prev, confirmPassword: error || undefined }));
    }
  };

  const handleAccept = () => {
    if (!token) return;

    if (verifyData?.data?.requiresPassword) {
      setTouched(true);

      // Validate password
      const passwordError = validatePassword(password);
      const confirmError = validatePasswordConfirmation(password, confirmPassword);

      if (passwordError || confirmError) {
        setFieldErrors({
          password: passwordError || undefined,
          confirmPassword: confirmError || undefined,
        });
        return;
      }

      acceptInvite({ token, password });
    } else {
      acceptInvite({ token });
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md p-8 shadow-xl border-border">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground mb-6">
              No invitation token found. Please check your invitation link.
            </p>
            <Link to="/auth/login">
              <Button>Go to Login</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md p-8 shadow-xl border-border">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader size="lg" />
            <p className="mt-4 text-muted-foreground">Verifying invitation...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (verifyError || !verifyData?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md p-8 shadow-xl border-border">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-6">
              {verifyError?.message || "This invitation link is invalid or has expired."}
            </p>
            <Link to="/auth/login">
              <Button>Go to Login</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md p-8 shadow-xl border-border">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to Voxora!</h2>
            <p className="text-muted-foreground mb-6">
              Your invitation has been accepted successfully. Redirecting to login...
            </p>
            <Link to="/auth/login">
              <Button>Continue to Login</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const inviteDetails = verifyData?.data;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md p-8 shadow-xl border-border">
        <CardHeader className="text-center pb-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">V</span>
          </div>
          <CardTitle className="text-2xl font-bold">
            Voxora Invitation
          </CardTitle>
          <CardDescription>
            You&apos;ve been invited to join {inviteDetails?.organization?.name || "an organization"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Name</p>
            <p className="font-medium">{inviteDetails?.name}</p>
            <p className="text-sm text-muted-foreground mt-2 mb-1">Email</p>
            <p className="font-medium">{inviteDetails?.email}</p>
          </div>

          {inviteDetails?.requiresPassword && (
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (touched) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    onBlur={handlePasswordBlur}
                    className={`pr-10 cursor-text ${touched && fieldErrors.password ? "border-destructive" : ""}`}
                    disabled={isAccepting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {touched && fieldErrors.password && (
                  <p className="text-sm text-destructive">{fieldErrors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (touched) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }}
                    onBlur={handleConfirmPasswordBlur}
                    className={`pr-10 cursor-text ${touched && fieldErrors.confirmPassword ? "border-destructive" : ""}`}
                    disabled={isAccepting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {touched && fieldErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>
          )}

          {isError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <p className="text-sm text-destructive">
                {acceptError?.message || "Failed to accept invitation"}
              </p>
            </div>
          )}

          <Button
            onClick={handleAccept}
            className="w-full cursor-pointer"
            disabled={isAccepting}
          >
            {isAccepting ? "Accepting..." : "Accept Invitation"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
