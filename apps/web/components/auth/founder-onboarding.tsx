"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Building,
  Globe,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "./auth-context";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import {
  validateName,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from "@/lib/validation";

interface AdminData {
  // Step 1: Account
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  // Step 2: Company
  companyName: string;
  companyWebsite: string;
  industry: string;
}

export function AdminOnboarding() {
  const { signup } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState<AdminData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    companyWebsite: "",
    industry: "",
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

  const industries = [
    "Technology",
    "E-commerce",
    "Healthcare",
    "Finance",
    "Education",
    "Real Estate",
    "Manufacturing",
    "Consulting",
    "Marketing",
    "Other",
  ];

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
          error = "Company name is required";
        } else if (formData.companyName.length < 2) {
          error = "Company name must be at least 2 characters";
        }
        break;
    }

    setFieldErrors((prev) => ({ ...prev, [field]: error || undefined }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear field error when user starts typing
    if (
      touched[
        name as "name" | "email" | "password" | "confirmPassword" | "companyName"
      ]
    ) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleNext = async () => {
    setError("");

    if (currentStep === 1) {
      // Mark step 1 fields as touched
      setTouched((prev) => ({
        ...prev,
        name: true,
        email: true,
        password: true,
        confirmPassword: true,
      }));

      // Validate step 1 fields
      const nameError = validateName(formData.name);
      const emailError = validateEmail(formData.email);
      const passwordError = validatePassword(formData.password);
      const confirmPasswordError = validatePasswordConfirmation(
        formData.password,
        formData.confirmPassword
      );

      const errors: {
        name?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
      } = {};

      if (nameError) errors.name = nameError;
      if (emailError) errors.email = emailError;
      if (passwordError) errors.password = passwordError;
      if (confirmPasswordError)
        errors.confirmPassword = confirmPasswordError;

      setFieldErrors(errors);

      // If there are errors, don't proceed
      if (Object.keys(errors).length > 0) {
        setError("Please fix the errors above");
        return;
      }

      setCurrentStep(2);
    } else {
      // Mark step 2 fields as touched
      setTouched((prev) => ({
        ...prev,
        companyName: true,
      }));

      // Validate step 2
      if (!formData.companyName) {
        setFieldErrors((prev) => ({
          ...prev,
          companyName: "Company name is required",
        }));
        setError("Company name is required");
        return;
      }

      if (formData.companyName.length < 2) {
        setFieldErrors((prev) => ({
          ...prev,
          companyName: "Company name must be at least 2 characters",
        }));
        setError("Company name must be at least 2 characters");
        return;
      }

      setIsLoading(true);
      try {
        await signup({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          companyName: formData.companyName,
        });
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Registration failed",
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
    setError("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
            {currentStep === 1 ? "Create Admin Account" : "Company Information"}
          </CardTitle>
          <CardDescription className="text-center">
            {currentStep === 1
              ? "Start your Voxora journey as an admin"
              : "Tell us about your company"}
          </CardDescription>

          {/* Progress Indicator */}
          <div className="flex space-x-2 pt-4">
            <div
              className={`flex-1 h-2 rounded-full ${currentStep >= 1 ? "bg-primary" : "bg-muted"}`}
            />
            <div
              className={`flex-1 h-2 rounded-full ${currentStep >= 2 ? "bg-primary" : "bg-muted"}`}
            />
          </div>
        </CardHeader>

        <CardContent>
          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="flex items-center space-x-2 mb-4">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </Alert>
          )}

          {currentStep === 1 ? (
            // Step 1: Account Information
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-foreground"
                >
                  Full Name
                </label>
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
                    className={`pl-10 ${
                      touched.name && fieldErrors.name
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }`}
                    required
                  />
                </div>
                {touched.name && fieldErrors.name && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Email Address
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
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }`}
                    required
                  />
                </div>
                {touched.email && fieldErrors.email && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
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
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur("password")}
                    className={`pl-10 pr-10 ${
                      touched.password && fieldErrors.password
                        ? "border-red-500 focus-visible:ring-red-500"
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
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.password}
                  </p>
                )}
                {!fieldErrors.password && formData.password && (
                  <p className="text-xs text-muted-foreground">
                    Must contain 8+ characters, uppercase, lowercase, number, and special character
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium text-foreground"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur("confirmPassword")}
                    className={`pl-10 pr-10 ${
                      touched.confirmPassword && fieldErrors.confirmPassword
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {touched.confirmPassword && fieldErrors.confirmPassword && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
          ) : (
            // Step 2: Company Information
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="companyName"
                  className="text-sm font-medium text-foreground"
                >
                  Company Name
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    placeholder="Enter your company name"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur("companyName")}
                    className={`pl-10 ${
                      touched.companyName && fieldErrors.companyName
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }`}
                    required
                  />
                </div>
                {touched.companyName && fieldErrors.companyName && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.companyName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="companyWebsite"
                  className="text-sm font-medium text-foreground"
                >
                  Company Website
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="companyWebsite"
                    name="companyWebsite"
                    type="url"
                    placeholder="https://yourcompany.com"
                    value={formData.companyWebsite}
                    onChange={handleInputChange}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="industry"
                  className="text-sm font-medium text-foreground"
                >
                  Industry
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                  <Select
                    value={formData.industry}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, industry: value }))
                    }
                  >
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-6">
            {currentStep === 2 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={isLoading}
              className={currentStep === 1 ? "w-full" : "flex-1"}
            >
              {isLoading
                ? "Creating Account..."
                : currentStep === 1
                  ? "Continue"
                  : "Complete Setup"}
            </Button>
          </div>

          {currentStep === 1 && (
            <div className="text-center text-sm text-muted-foreground pt-4">
              Already have an account?{" "}
              <Link href="/admin-login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
