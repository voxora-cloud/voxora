"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  HeadphonesIcon,
  Users,
  Clock,
  Star,
  ArrowRight,
  Shield,
  Zap,
  Globe,
} from "lucide-react";
import { useRouter } from "next/navigation";

export function SupportLandingPage() {
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginData.email && loginData.password) {
      // Simulate login - in real app, validate credentials
      router.push("/support/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">
                V
              </span>
            </div>
            <span className="text-xl font-bold text-foreground">
              Voxora Support
            </span>
          </div>

          <nav className="flex items-center space-x-6">
            <Link
              href="#features"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="#benefits"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Benefits
            </Link>
            <Link
              href="#contact"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Hero Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                Professional
                <span className="text-primary"> Support Portal</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Join our support team and help customers succeed. Access
                advanced tools, real-time communication, and comprehensive agent
                resources.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 p-4 bg-background/60 rounded-lg border">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Real-time Chat
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Instant customer support
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-background/60 rounded-lg border">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Team Collaboration
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Work together seamlessly
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-background/60 rounded-lg border">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    24/7 Support
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Round-the-clock assistance
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-background/60 rounded-lg border">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <Star className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Performance Metrics
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Track your success
                  </p>
                </div>
              </div>
            </div>

            {/* Benefits Section */}
            <div id="benefits" className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">
                Why Choose Voxora Support?
              </h2>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground">
                      Secure & Reliable
                    </h4>
                    <p className="text-muted-foreground">
                      Enterprise-grade security with 99.9% uptime
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Zap className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground">
                      Lightning Fast
                    </h4>
                    <p className="text-muted-foreground">
                      Instant message delivery and real-time updates
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Globe className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground">
                      Global Reach
                    </h4>
                    <p className="text-muted-foreground">
                      Support customers worldwide with multi-language support
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="lg:pl-8">
            <Card className="w-full max-w-md mx-auto bg-background/80 backdrop-blur-sm border-border/50">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <HeadphonesIcon className="h-8 w-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">Agent Login</CardTitle>
                <CardDescription>
                  Access your support dashboard and start helping customers
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="text-sm font-medium text-foreground"
                    >
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="agent@company.com"
                      value={loginData.email}
                      onChange={(e) =>
                        setLoginData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      required
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-foreground"
                    >
                      Password
                    </label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) =>
                        setLoginData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      required
                      className="bg-background/50"
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <Link href="#" className="text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    Sign In to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>

                <div className="mt-6 pt-4 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    Need access?{" "}
                    <Link href="#contact" className="text-primary hover:underline">
                      Contact your administrator
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        id="contact"
        className="border-t border-border/40 bg-background/60 backdrop-blur-sm mt-16"
      >
        <div className="container mx-auto px-6 py-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">
                    V
                  </span>
                </div>
                <span className="font-bold text-foreground">
                  Voxora Support
                </span>
              </div>
              <p className="text-muted-foreground text-sm">
                Empowering support teams with professional communication tools.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">
                Quick Links
              </h4>
              <div className="space-y-2 text-sm">
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground block"
                >
                  Documentation
                </Link>
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground block"
                >
                  Training Resources
                </Link>
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground block"
                >
                  Support Guidelines
                </Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">
                Contact Admin
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Email: admin@company.com</p>
                <p>Phone: +1 (555) 123-4567</p>
                <p>Hours: 24/7 Support Available</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border/40 mt-8 pt-6 text-center">
            <p className="text-muted-foreground text-sm">
              © 2024 Voxora Support. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
