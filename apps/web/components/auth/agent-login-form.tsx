"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { Loader } from "../ui/loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "./auth-context";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { validateLoginForm, validateEmail } from "@/lib/validation";

export function AgentLoginForm() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
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
    setIsLoading(true);
    setError("");

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
      setIsLoading(false);
      return;
    }

    try {
      // Login as agent
      await login(formData.email, formData.password, "agent");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <Image
            src="/logo.png"
            alt="Voxora Logo"
            width={48}
            height={48}
            className="object-contain"
          />
        </div>
        <CardTitle className="text-2xl text-center">
          Agent Login
        </CardTitle>
        <CardDescription className="text-center">
          Sign in to access your support dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </Alert>
          )}

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={() => handleBlur("email")}
                className={`pl-10 ${
                  touched.email && fieldErrors.email
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }`}
                required
              />
            </div>
            {touched.email && fieldErrors.email && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                onBlur={() => handleBlur("password")}
                className={`pl-10 pr-10 ${
                  touched.password && fieldErrors.password
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {touched.password && fieldErrors.password && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4">
                  <Loader size="sm" />
                </div>
                <span>Signing in...</span>
              </div>
            ) : (
              "Sign in as Agent"
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Need an invitation?{" "}
            <Link href="/agent-signup" className="text-primary hover:underline">
              Learn more
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
