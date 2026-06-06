import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Eye, EyeOff, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { useLogin } from "../hooks";
import { Link } from "react-router";
import { Label } from "@/shared/ui/label";
import { validateEmail, validateLoginForm } from "@/shared/lib/validation";
import type { LoginPayload } from "../types/types";
import { authApi } from "../api/auth.api";
import { OTPInput } from "./otp-input.tsx";
import { ResendOTPTimer } from "./resend-otp-timer.tsx";
import { motion, AnimatePresence } from "framer-motion";

export function LoginForm() {
  const { mutate: login, isPending, isError, error } = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [formData, setFormData] = useState<LoginPayload>({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });

  const handleBlur = (field: "email" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "email") {
      const emailError = validateEmail(formData.email);
      setFieldErrors((prev) => ({ ...prev, email: emailError || undefined }));
    } else if (field === "password") {
      setFieldErrors((prev) => ({
        ...prev,
        password: !formData.password ? "Password is required" : undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const validation = validateLoginForm(formData.email, formData.password);
    if (!validation.isValid) {
      const errors: { email?: string; password?: string } = {};
      validation.errors.forEach((err) => {
        if (err.field === "email" || err.field === "password") errors[err.field] = err.message;
      });
      setFieldErrors(errors);
      return;
    }
    login(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name as keyof LoginPayload]: value }));
    if (touched[name as keyof typeof touched]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const requiresEmailVerification =
    isError && (error?.message || "").toLowerCase().includes("verify your email");

  const handleSendVerification = async () => {
    const emailError = validateEmail(formData.email);
    if (emailError) { setVerificationError(emailError); return; }
    setIsSendingVerification(true);
    setVerificationError(null);
    try {
      await authApi.sendEmailVerification(formData.email);
      setVerificationSent(true);
    } catch (err: any) {
      setVerificationError(err.message || "Failed to send verification.");
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleVerifyLoginOtp = async (code: string) => {
    setVerificationOtp(code);
    setIsSendingVerification(true);
    setVerificationError(null);
    try {
      await authApi.verifyOTP(formData.email, code, "email_verification");
      login(formData);
    } catch (err: any) {
      setVerificationError(err.message || "Invalid or expired code.");
    } finally {
      setIsSendingVerification(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
       
        <h1 className="type-display-lg-mobile md:type-display-lg text-foreground">
          Sign in to your<br />
          <span className="text-primary">account</span>
        </h1>
        <p className="mt-2 type-body-md text-muted-foreground">
          Continue where you left off.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Global error */}
        <AnimatePresence>
          {isError && !requiresEmailVerification && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-destructive/10 border border-destructive/20 p-3 rounded-sm flex items-center gap-3 text-destructive text-sm overflow-hidden"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="font-medium">{error?.message || "Login failed"}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email verification prompt */}
        {requiresEmailVerification && (
          <div className="rounded-sm border border-border/50 bg-muted/20 p-4 space-y-4">
            <p className="text-sm font-semibold text-foreground">Verify your email first</p>
            <p className="text-xs text-muted-foreground">
              We will send a 6-digit verification code to your email.
            </p>
            {verificationError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{verificationError}
              </p>
            )}
            {verificationSent && (
              <p className="text-xs text-muted-foreground">
                Verification code sent. Enter the OTP below to continue.
              </p>
            )}
            {verificationSent && (
              <div className="space-y-3">
                <OTPInput
                  value={verificationOtp}
                  onChange={(value) => { setVerificationOtp(value); if (value.length === 6) handleVerifyLoginOtp(value); }}
                  disabled={isSendingVerification}
                />
                <ResendOTPTimer onResend={handleSendVerification} disabled={isSendingVerification} />
              </div>
            )}
            {!verificationSent && (
              <Button type="button" variant="outline" className="w-full h-11 rounded-sm cursor-pointer"
                onClick={handleSendVerification} disabled={isSendingVerification}>
                {isSendingVerification ? "Sending..." : "Send Verification Code"}
              </Button>
            )}
          </div>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="type-label-caps text-muted-foreground">
            Work Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={() => handleBlur("email")}
              className={`pl-10 h-12 rounded-sm border-border/60 bg-muted/30 focus:bg-background transition-colors cursor-text ${
                fieldErrors.email && touched.email ? "border-destructive" : ""
              }`}
              disabled={isPending}
            />
          </div>
          {fieldErrors.email && touched.email && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />{fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="type-label-caps text-muted-foreground">
              Password
            </Label>
            <Link to="/auth/password-recovery" className="text-xs text-primary hover:underline font-semibold">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={formData.password}
              onChange={handleInputChange}
              onBlur={() => handleBlur("password")}
              className={`pl-10 pr-11 h-12 rounded-sm border-border/60 bg-muted/30 focus:bg-background transition-colors cursor-text ${
                fieldErrors.password && touched.password ? "border-destructive" : ""
              }`}
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.password && touched.password && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />{fieldErrors.password}
            </p>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-12 rounded-sm type-button shadow-lg shadow-primary/20 cursor-pointer"
          disabled={isPending}
        >
          {isPending ? "Signing in..." : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground font-medium">
          Don't have an account?{" "}
          <Link to="/auth/signup" className="text-primary hover:underline font-bold">
            Create account
          </Link>
        </p>
      </form>
    </div>
  );
}
