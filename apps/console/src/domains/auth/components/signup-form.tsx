import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router";
import { Label } from "@/shared/ui/label";
import {
  validateCompanyName,
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordConfirmation,
} from "@/shared/lib/validation";
import { useInitiateSignup, useCompleteSignup } from "../hooks/useSignup.ts";
import { OTPInput } from "./otp-input.tsx";
import { ResendOTPTimer } from "./resend-otp-timer.tsx";
import { authApi } from "../api/auth.api.ts";

type FieldName = "name" | "email" | "password" | "confirmPassword" | "companyName";
type FieldErrors = Partial<Record<FieldName, string>>;
type TouchedFields = Record<FieldName, boolean>;

const totalSteps = 4;

const STEPS = [
  { number: 1, label: "Profile", icon: User },
  { number: 2, label: "Verify", icon: ShieldCheck },
  { number: 3, label: "Workspace", icon: Building2 },
  { number: 4, label: "Security", icon: Lock },
];

const stepVariants = {
  initial: { opacity: 0, x: 24, filter: "blur(6px)" },
  animate: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: { opacity: 0, x: -24, filter: "blur(6px)" },
};

const stepTransition = {
  duration: 0.35,
  ease: [0.23, 1, 0.32, 1] as const,
};


function getFieldError(field: FieldName, formData: any) {
  switch (field) {
    case "name":
      return validateName(formData.name);
    case "email":
      return validateEmail(formData.email);
    case "password":
      return validatePassword(formData.password);
    case "confirmPassword":
      return validatePasswordConfirmation(formData.password, formData.confirmPassword);
    case "companyName":
      return validateCompanyName(formData.companyName);
    default:
      return null;
  }
}

export function SignupForm() {
  const { mutate: completeSignup, isPending: isCompleting } = useCompleteSignup();
  const { mutate: initiateSignup, isPending: isInitiating } = useInitiateSignup();

  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
    companyName: false,
  });

  const passwordChecks = useMemo(
    () => [
      { label: "8+ characters", isValid: formData.password.length >= 8 },
      { label: "Uppercase letter", isValid: /[A-Z]/.test(formData.password) },
      { label: "Lowercase letter", isValid: /[a-z]/.test(formData.password) },
      { label: "Number", isValid: /[0-9]/.test(formData.password) },
      { label: "Special character", isValid: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) },
    ],
    [formData.password]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched[name as FieldName]) {
      const fieldError = getFieldError(name as FieldName, { ...formData, [name]: value });
      setFieldErrors((prev) => ({ ...prev, [name]: fieldError || undefined }));
    }
  };

  const handleBlur = (field: FieldName) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const fieldError = getFieldError(field, formData);
    setFieldErrors((prev) => ({ ...prev, [field]: fieldError || undefined }));
  };

  const isStepValid = (step: number) => {
    if (step === 1) {
      return !validateName(formData.name) && !validateEmail(formData.email);
    }
    if (step === 2) {
      return otp.length === 6;
    }
    if (step === 3) {
      return !validateCompanyName(formData.companyName);
    }
    if (step === 4) {
      return (
        !validatePassword(formData.password) &&
        !validatePasswordConfirmation(formData.password, formData.confirmPassword)
      );
    }
    return true;
  };

  const goToNextStep = async () => {
    setError(null);
    if (currentStep === 1) {
      initiateSignup(
        { name: formData.name, email: formData.email },
        {
          onSuccess: () => setCurrentStep(2),
          onError: (err: any) => setError(err.message || "Failed to start signup"),
        }
      );
    } else if (currentStep === 2) {
      setIsVerifying(true);
      try {
        await authApi.verifyOTP(formData.email, otp, "email_verification");
        setCurrentStep(3);
      } catch (err: any) {
        setError(err.message || "Invalid or expired code");
      } finally {
        setIsVerifying(false);
      }
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep === 4) {
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    completeSignup(
      {
        email: formData.email,
        organizationName: formData.companyName,
        password: formData.password,
      },
      {
        onSuccess: () => {
          window.location.href = "/dashboard";
        },
        onError: (err: any) => setError(err.message || "Final setup failed"),
      }
    );
  };

  const handleResendOTP = async () => {
    await authApi.resendOTP(formData.email, "email_verification");
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">

        <h1 className="type-display-lg-mobile font-bold md:type-display-lg text-foreground">
          Create your
          <span className="text-primary"> account</span>
        </h1>
        <p className="mt-2 type-body-md text-muted-foreground">
          Set up InteraOne for your team in minutes.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          {/* connector line */}
          <div className="absolute top-4 left-0 right-0 h-px bg-border/50 -z-10" />
          <div
            className="absolute top-4 left-0 h-px bg-primary transition-all duration-500 -z-10"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          />
          {STEPS.map((step) => {
            const isCompleted = currentStep > step.number;
            const isActive = currentStep === step.number;
            const StepIcon = step.icon;
            return (
              <div key={step.number} className="flex flex-col items-center gap-1.5">
                <motion.div
                  animate={{
                    backgroundColor: isCompleted
                      ? "var(--color-primary)"
                      : isActive
                        ? "var(--color-primary)"
                        : "var(--color-muted)",
                    borderColor: isCompleted || isActive
                      ? "var(--color-primary)"
                      : "var(--color-border)",
                  }}
                  transition={{ duration: 0.3 }}
                  className="h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <StepIcon
                      className={`h-3.5 w-3.5 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`}
                    />
                  )}
                </motion.div>
                <span
                  className={`type-label-caps text-[10px] transition-colors ${isActive ? "text-primary" : isCompleted ? "text-foreground/70" : "text-muted-foreground/50"
                    }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="bg-destructive/10 border border-destructive/20 p-3 rounded-sm flex items-center gap-3 text-destructive text-sm overflow-hidden"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step Content */}
      <div className="relative min-h-[180px] sm:min-h-[210px]">
        <AnimatePresence mode="wait" initial={false}>
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={stepTransition}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="name" className="type-label-caps text-muted-foreground">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="name"
                    name="name"
                    placeholder="Nancy Drew"
                    className="pl-10 h-12 rounded-sm border-border/60 bg-muted/30 focus:bg-background transition-colors cursor-text"
                    value={formData.name}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur("name")}
                    disabled={isInitiating}
                  />
                </div>
                {touched.name && fieldErrors.name && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{fieldErrors.name}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="type-label-caps text-muted-foreground">Work Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    className="pl-10 h-12 rounded-sm border-border/60 bg-muted/30 focus:bg-background transition-colors cursor-text"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur("email")}
                    disabled={isInitiating}
                  />
                </div>
                {touched.email && fieldErrors.email && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{fieldErrors.email}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step-2"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={stepTransition}
              className="space-y-6"
            >
              <div className="rounded-2xl bg-primary/5 border border-primary/15 p-5 text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">Check your inbox</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We sent a 6-digit verification code to{" "}
                  <span className="text-primary font-bold">{formData.email}</span>
                </p>
              </div>
              <OTPInput value={otp} onChange={setOtp} disabled={isVerifying} />
              <ResendOTPTimer onResend={handleResendOTP} disabled={isVerifying} />
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step-3"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={stepTransition}
              className="space-y-4"
            >
              <div className="rounded-2xl bg-muted/20 border border-border/40 p-4 mb-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your workspace is where your team collaborates. Choose a name that represents your company or project.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="companyName" className="type-label-caps text-muted-foreground">Organization Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="companyName"
                    name="companyName"
                    placeholder="Acme Inc."
                    className="pl-10 h-12 rounded-sm border-border/60 bg-muted/30 focus:bg-background transition-colors cursor-text"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur("companyName")}
                  />
                </div>
                {touched.companyName && fieldErrors.companyName && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{fieldErrors.companyName}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step-4"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={stepTransition}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="password" className="type-label-caps text-muted-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    className="pl-10 pr-11 h-12 rounded-sm border-border/60 bg-muted/30 focus:bg-background transition-colors cursor-text"
                    value={formData.password}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-muted/20 border border-border/30">
                {passwordChecks.map((check) => (
                  <motion.div
                    key={check.label}
                    animate={{ opacity: check.isValid ? 1 : 0.4 }}
                    className={`flex items-center gap-1.5 ${check.isValid ? "text-primary" : "text-muted-foreground"}`}
                  >
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    <span className="text-[10px] font-semibold">{check.label}</span>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="type-label-caps text-muted-foreground">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    className="pl-10 pr-11 h-12 rounded-sm border-border/60 bg-muted/30 focus:bg-background transition-colors cursor-text"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {touched.confirmPassword && fieldErrors.confirmPassword && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="mt-4 space-y-4">
        <div className="flex gap-3">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={isVerifying || isCompleting}
              className="h-12 px-5 rounded-sm type-button border-border/60 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <Button
            onClick={goToNextStep}
            disabled={!isStepValid(currentStep) || isInitiating || isVerifying || isCompleting}
            className="flex-1 h-12 rounded-sm type-button shadow-lg shadow-primary/20 cursor-pointer"
          >
            {isInitiating || isVerifying || isCompleting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {currentStep === 4 ? "Complete Setup" : currentStep === 2 ? "Verify Email" : currentStep === 3 ? "Next — Security" : "Continue"}
            {!isInitiating && !isVerifying && !isCompleting && (
              <ArrowRight className="h-4 w-4 ml-2" />
            )}
          </Button>
        </div>

        {currentStep === 1 && (
          <p className="text-center text-sm text-muted-foreground font-medium">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-primary hover:underline font-bold">
              Sign in
            </Link>
          </p>
        )}

        {currentStep === 4 && (
          <p className="text-center text-xs text-muted-foreground/60 leading-relaxed">
            By continuing, you agree to our{" "}
            <a href="#" className="underline hover:text-muted-foreground">Terms of Service</a>{" "}
            and{" "}
            <a href="#" className="underline hover:text-muted-foreground">Privacy Policy</a>.
          </p>
        )}
      </div>
    </div>
  );
}
