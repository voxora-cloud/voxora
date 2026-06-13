import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Mail,
  Lock,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  ArrowRight,
} from "lucide-react";
import { validateEmail, validatePassword } from "@/shared/lib/validation";
import { authApi } from "../api/auth.api.ts";
import { OTPInput } from "./otp-input.tsx";
import { ResendOTPTimer } from "./resend-otp-timer.tsx";
import { motion, AnimatePresence } from "framer-motion";

type RecoveryStep = "email" | "otp" | "reset";


export function PasswordRecoveryForm() {
  const navigate = useNavigate();

  const [step, setStep] = useState<RecoveryStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);



  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to send reset code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpComplete = async (code: string) => {
    setOtp(code);
    setIsLoading(true);
    setError(null);
    try {
      await authApi.verifyOTP(email, code, "password_reset");
      setStep("reset");
    } catch (err: any) {
      setError(err.message || "Invalid or expired code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    await authApi.resendOTP(email, "password_reset");
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authApi.resetPasswordWithOTP({ email, code: otp, newPassword: password });
      setIsSuccess(true);
      setTimeout(() => navigate("/auth/login"), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full text-center space-y-6">
        <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="type-headline-sm text-foreground mb-2">
            Password updated!
          </h2>
          <p className="type-body-md text-muted-foreground leading-relaxed">
            Your password has been reset. Redirecting to login...
          </p>
        </div>
        <Link to="/auth/login">
          <Button className="w-full h-12 rounded-sm type-button cursor-pointer">Go to Login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-4">
          <KeyRound className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">
            {step === "email" ? "Account recovery" : step === "otp" ? "Verification" : "New password"}
          </span>
        </div>
        <h1 className="type-display-lg-mobile md:type-display-lg text-foreground">
          {step === "email" && (<>Reset your<br /><span className="text-primary">password</span></>)}
          {step === "otp" && (<>Enter the<br /><span className="text-primary">code</span></>)}
          {step === "reset" && (<>Create new<br /><span className="text-primary">password</span></>)}
        </h1>
        <p className="mt-2 type-body-md text-muted-foreground">
          {step === "email" && "Enter your email to receive a secure reset code."}
          {step === "otp" && `We sent a 6-digit code to ${email}`}
          {step === "reset" && "Choose a strong, unique password for your account."}
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5 mb-8">
        {(["email", "otp", "reset"] as RecoveryStep[]).map((s) => {
          const stepIndex = ["email", "otp", "reset"].indexOf(s);
          const currentIndex = ["email", "otp", "reset"].indexOf(step);
          return (
            <div key={s} className="flex-1 h-1 rounded-full bg-muted/40 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: currentIndex >= stepIndex ? "100%" : "0%" }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          );
        })}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="bg-destructive/10 border border-destructive/20 p-3 rounded-sm flex items-center gap-3 text-destructive text-sm overflow-hidden"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step: email */}
      {step === "email" && (
        <form onSubmit={handleEmailSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="type-label-caps text-muted-foreground">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 rounded-sm border-border/60 bg-muted/30 focus:bg-background transition-colors cursor-text"
                disabled={isLoading}
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 rounded-sm type-button shadow-lg shadow-primary/20 cursor-pointer" disabled={isLoading}>
            {isLoading ? "Sending..." : (
              <>Send OTP<ArrowRight className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </form>
      )}

      {/* Step: OTP */}
      {step === "otp" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-primary/5 border border-primary/15 p-5 text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">
              Code sent to <span className="font-bold text-foreground">{email}</span>
            </p>
          </div>
          <OTPInput value={otp} onChange={(val) => { setOtp(val); if (val.length === 6) handleOtpComplete(val); }} disabled={isLoading} />
          <ResendOTPTimer onResend={handleResend} />
          <Button variant="ghost" className="w-full text-muted-foreground cursor-pointer" onClick={() => setStep("email")} disabled={isLoading}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Change email
          </Button>
        </div>
      )}

      {/* Step: reset */}
      {step === "reset" && (
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="type-label-caps text-muted-foreground">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                className="pl-10 pr-11 h-12 rounded-sm border-border/60 bg-muted/30 focus:bg-background transition-colors cursor-text"
                disabled={isLoading}
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="type-label-caps text-muted-foreground">Confirm Password</Label>
            <div className="relative">
              <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                className="pl-10 pr-11 h-12 rounded-sm border-border/60 bg-muted/30 focus:bg-background transition-colors cursor-text"
                disabled={isLoading}
                required
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit"
            className="w-full h-12 rounded-sm type-button shadow-lg shadow-primary/20 cursor-pointer"
            disabled={isLoading}>
            {isLoading ? "Updating..." : (<>Reset Password<ArrowRight className="h-4 w-4 ml-2" /></>)}
          </Button>
        </form>
      )}

      <div className="mt-8 text-center">
        <Link to="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
      </div>
    </div>
  );
}
