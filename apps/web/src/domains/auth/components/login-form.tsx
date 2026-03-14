
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { useLogin } from "../hooks";
import { Link } from "react-router";
import { Alert } from "@/shared/ui/alert";
import { validateEmail, validateLoginForm } from "@/shared/lib/validation";
import type { LoginPayload } from "../types/types";
import Logo from "@/shared/components/logo";

export function LoginForm() {
  const { mutate: login, isPending, isError, error } = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<LoginPayload>({
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [touched, setTouched] = useState<{
    email: boolean;
    password: boolean;
  }>({
    email: false,
    password: false,
  });

  const handleBlur = (field: "email" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    if (field === "email") {
      const emailError = validateEmail(formData.email);
      setFieldErrors((prev) => ({ ...prev, email: emailError || undefined }));
    } else if (field === "password") {
      if (!formData.password) {
        setFieldErrors((prev) => ({
          ...prev,
          password: "Password is required",
        }));
      } else {
        setFieldErrors((prev) => ({ ...prev, password: undefined }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ email: true, password: true });

    // Validate form
    const validation = validateLoginForm(formData.email, formData.password);

    if (!validation.isValid) {
      const errors: { email?: string; password?: string } = {};
      validation.errors.forEach((err) => {
        if (err.field === "email" || err.field === "password") {
          errors[err.field] = err.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    login(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear field error when user starts typing
    if (touched[name as "email" | "password"]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Logo size={48} />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
        <CardDescription className="text-center">
          Sign in to your Voxora account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error?.message || "Login failed"}</span>
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
                value={formData.email}
                onChange={handleInputChange}
                onBlur={() => handleBlur("email")}
                className={`pl-10 cursor-text ${fieldErrors.email && touched.email ? "border-destructive" : ""}`}
                disabled={isPending}
              />
            </div>
            {fieldErrors.email && touched.email && (
              <p className="text-sm text-destructive">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
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
                className={`pl-10 pr-10 cursor-text ${fieldErrors.password && touched.password ? "border-destructive" : ""}`}
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
            {fieldErrors.password && touched.password && (
              <p className="text-sm text-destructive">{fieldErrors.password}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Link
              to="/auth/password-recovery"
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full cursor-pointer"
            disabled={isPending}
          >
            {isPending ? "Signing in..." : "Sign in"}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link to="/auth/setup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}