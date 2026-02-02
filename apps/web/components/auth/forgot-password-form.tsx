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
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { apiService } from "@/lib/api";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { validateEmail } from "@/lib/validation";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);

  const handleBlur = () => {
    setTouched(true);
    const error = validateEmail(email);
    setEmailError(error || undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setTouched(true);

    // Validate email
    const emailValidationError = validateEmail(email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      setIsLoading(false);
      return;
    }

    try {
      await apiService.forgotPassword(email);
      setIsSuccess(true);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to send reset email",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (touched) {
      setEmailError(undefined);
    }
  };

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
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
              className="w-full"
              onClick={() => {
                setIsSuccess(false);
                setEmail("");
              }}
            >
              Try again
            </Button>
            <Button variant="ghost" asChild className="w-full">
              <Link href="/admin-login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
          Forgot your password?
        </CardTitle>
        <CardDescription className="text-center">
          Enter your email address and we&apos;ll send you a link to reset your
          password.
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
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleBlur}
                className={`pl-10 ${
                  touched && emailError
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }`}
                required
              />
            </div>
            {touched && emailError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {emailError}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send reset link"}
          </Button>

          <Button variant="ghost" asChild className="w-full">
            <Link href="/admin-login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
