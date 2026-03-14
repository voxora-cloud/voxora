import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  Mail,
  Lock,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Alert } from "@/shared/ui/alert";
import { validateEmail, validatePassword } from "@/shared/lib/validation";
import { useForgotPassword, useResetPassword } from "../hooks";

export function PasswordRecoveryForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const isResetMode = !!token;

  // Forgot password state
  const { mutate: forgotPassword, isPending: isForgotPending, isSuccess: isForgotSuccess, isError: isForgotError, error: forgotError } = useForgotPassword();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [emailTouched, setEmailTouched] = useState(false);

  // Reset password state
  const { mutate: resetPassword, isPending: isResetPending, isSuccess: isResetSuccess, isError: isResetError, error: resetError } = useResetPassword();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | undefined>();
  const [passwordTouched, setPasswordTouched] = useState({ password: false, confirmPassword: false });

  // Redirect to login after successful reset
  useEffect(() => {
    if (isResetSuccess) {
      const timer = setTimeout(() => {
        navigate("/auth/login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isResetSuccess, navigate]);

  // Forgot Password Handlers
  const handleEmailBlur = () => {
    setEmailTouched(true);
    const error = validateEmail(email);
    setEmailError(error || undefined);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);

    const emailValidationError = validateEmail(email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }

    forgotPassword(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailTouched) {
      setEmailError(undefined);
    }
  };

  // Reset Password Handlers
  const handlePasswordBlur = () => {
    setPasswordTouched({ ...passwordTouched, password: true });
    const error = validatePassword(password);
    setPasswordError(error || undefined);
  };

  const handleConfirmPasswordBlur = () => {
    setPasswordTouched({ ...passwordTouched, confirmPassword: true });
    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError(undefined);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordTouched({ password: true, confirmPassword: true });

    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return;
    }

    if (!token) {
      return;
    }

    resetPassword({ token, newPassword: password });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordTouched.password) {
      setPasswordError(undefined);
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (passwordTouched.confirmPassword) {
      setConfirmPasswordError(undefined);
    }
  };

  // Success State - Email Sent
  if (isForgotSuccess) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a password reset link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground mb-4">
            Didn&apos;t receive the email? Check your spam folder or try again.
          </div>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full cursor-pointer"
              onClick={() => {
                setEmail("");
                setEmailTouched(false);
                window.location.reload();
              }}
            >
              Try again
            </Button>
            <Link to="/auth/login" className="block w-full">
              <Button variant="ghost" className="w-full cursor-pointer">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success State - Password Reset
  if (isResetSuccess) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
          </div>
          <CardTitle className="text-2xl">Password reset successful</CardTitle>
          <CardDescription>
            Your password has been successfully reset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground mb-4">
            Redirecting to login page...
          </div>
          <Link to="/auth/login" className="block w-full">
            <Button className="w-full cursor-pointer">Go to login</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Invalid Token State
  if (isResetMode && !token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">Invalid Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/auth/password-recovery" className="block w-full">
            <Button className="w-full cursor-pointer">
              Request new link
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Reset Password Form
  if (isResetMode) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            {isResetError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{resetError?.message || "Failed to reset password"}</span>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  className={`pl-10 pr-10 cursor-text ${passwordTouched.password && passwordError ? "border-destructive" : ""}`}
                  disabled={isResetPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordTouched.password && passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  onBlur={handleConfirmPasswordBlur}
                  className={`pl-10 pr-10 cursor-text ${passwordTouched.confirmPassword && confirmPasswordError ? "border-destructive" : ""}`}
                  disabled={isResetPending}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordTouched.confirmPassword && confirmPasswordError && (
                <p className="text-sm text-destructive">{confirmPasswordError}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={isResetPending}
            >
              {isResetPending ? "Resetting..." : "Reset password"}
            </Button>

            <div className="text-center">
              <Link
                to="/auth/login"
                className="text-sm text-muted-foreground hover:text-primary inline-flex items-center cursor-pointer"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Forgot Password Form (Default)
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">V</span>
          </div>
        </div>
        <CardTitle className="text-2xl text-center">Forgot Password</CardTitle>
        <CardDescription className="text-center">
          Enter your email address and we&apos;ll send you a password reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
          {isForgotError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{forgotError?.message || "Failed to send reset email"}</span>
            </Alert>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                className={`pl-10 cursor-text ${emailError && emailTouched ? "border-destructive" : ""}`}
                disabled={isForgotPending}
              />
            </div>
            {emailError && emailTouched && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full cursor-pointer"
            disabled={isForgotPending}
          >
            {isForgotPending ? "Sending..." : "Send reset link"}
          </Button>

          <div className="text-center">
            <Link
              to="/auth/login"
              className="text-sm text-muted-foreground hover:text-primary inline-flex items-center cursor-pointer"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
