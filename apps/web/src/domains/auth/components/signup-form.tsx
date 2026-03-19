import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Building } from "lucide-react";
import { Link } from "react-router";
import { Alert } from "@/shared/ui/alert";
import { Label } from "@/shared/ui/label";
import {
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordConfirmation,
} from "@/shared/lib/validation";
import { useSignup } from "../hooks";
import type { SignupPayload } from "../types/types";

export function SignupForm() {
  const { mutate: signup, isPending, isError, error } = useSignup();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
  });
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    companyName?: string;
  }>({});
  const [touched, setTouched] = useState<{
    name: boolean;
    email: boolean;
    password: boolean;
    confirmPassword: boolean;
    companyName: boolean;
  }>({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
    companyName: false,
  });

  const handleBlur = (
    field: "name" | "email" | "password" | "confirmPassword" | "companyName"
  ) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    let error: string | null = null;
    switch (field) {
      case "name":
        error = validateName(formData.name);
        break;
      case "email":
        error = validateEmail(formData.email);
        break;
      case "password":
        error = validatePassword(formData.password);
        break;
      case "confirmPassword":
        error = validatePasswordConfirmation(
          formData.password,
          formData.confirmPassword
        );
        break;
      case "companyName":
        if (!formData.companyName) {
          error = "Organization is required";
        } else if (formData.companyName.length < 2) {
          error = "Organization name must be at least 2 characters";
        }
        break;
    }

    setFieldErrors((prev) => ({ ...prev, [field]: error || undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      companyName: true,
    });

    // Validate all fields
    const errors: typeof fieldErrors = {};
    const nameError = validateName(formData.name);
    if (nameError) errors.name = nameError;
    
    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;
    
    const passwordError = validatePassword(formData.password);
    if (passwordError) errors.password = passwordError;
    
    const confirmError = validatePasswordConfirmation(
      formData.password,
      formData.confirmPassword
    );
    if (confirmError) errors.confirmPassword = confirmError;
    
    if (!formData.companyName) {
      errors.companyName = "Organization is required";
    } else if (formData.companyName.length < 2) {
      errors.companyName = "Organization name must be at least 2 characters";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const signupData: SignupPayload = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      companyName: formData.companyName,
    };

    signup(signupData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear field error when user starts typing
    if (touched[name as keyof typeof touched]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className="w-full">
      <div className="space-y-1 mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Create Account</h2>
        <p className="text-sm text-muted-foreground">
          Start your journey with Voxora
        </p>
      </div>
      <div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error?.message || "Signup failed"}</span>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleInputChange}
                onBlur={() => handleBlur("name")}
                className={`pl-10 cursor-text ${touched.name && fieldErrors.name ? "border-destructive" : ""}`}
                disabled={isPending}
              />
            </div>
            {touched.name && fieldErrors.name && (
              <p className="text-sm text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={() => handleBlur("email")}
                className={`pl-10 cursor-text ${touched.email && fieldErrors.email ? "border-destructive" : ""}`}
                disabled={isPending}
              />
            </div>
            {touched.email && fieldErrors.email && (
              <p className="text-sm text-destructive">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">
              Organization Name
            </Label>
            <div className="relative">
              <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="Enter your organization name"
                value={formData.companyName}
                onChange={handleInputChange}
                onBlur={() => handleBlur("companyName")}
                className={`pl-10 cursor-text ${touched.companyName && fieldErrors.companyName ? "border-destructive" : ""}`}
                disabled={isPending}
              />
            </div>
            {touched.companyName && fieldErrors.companyName && (
              <p className="text-sm text-destructive">{fieldErrors.companyName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                onBlur={() => handleBlur("password")}
                className={`pl-10 pr-10 cursor-text ${touched.password && fieldErrors.password ? "border-destructive" : ""}`}
                disabled={isPending}
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
            {touched.password && fieldErrors.password && (
              <p className="text-sm text-destructive">{fieldErrors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                onBlur={() => handleBlur("confirmPassword")}
                className={`pl-10 pr-10 cursor-text ${touched.confirmPassword && fieldErrors.confirmPassword ? "border-destructive" : ""}`}
                disabled={isPending}
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
            {touched.confirmPassword && fieldErrors.confirmPassword && (
              <p className="text-sm text-destructive">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full cursor-pointer"
            disabled={isPending}
          >
            {isPending ? "Creating account..." : "Create account"}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
