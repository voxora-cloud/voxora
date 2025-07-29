"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, Users, Shield, Zap, ArrowRight, CheckCircle } from "lucide-react"
import Link from "next/link"

export function LandingPage() {
  const features = [
    {
      icon: MessageCircle,
      title: "Real-time Chat",
      description: "Instant messaging with real-time updates for seamless communication"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Connect multiple support agents to handle customer queries efficiently"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "End-to-end encryption ensures your conversations remain private"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Built with modern technology for ultra-fast performance"
    }
  ]

  const benefits = [
    "24/7 Customer Support",
    "Multi-channel Communication",
    "Advanced Analytics",
    "Custom Integrations",
    "Mobile Responsive",
    "Open Source"
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">V</span>
            </div>
            <span className="text-xl font-bold text-foreground">Voxora</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              About
            </Link>
          </nav>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Start as Founder</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Real-time Chat Support
              <span className="block text-primary">Made Simple</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connect with your customers instantly through our powerful, open-source chat support platform. 
              Designed for teams who value speed, security, and simplicity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/demo">View Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose Voxora?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built by developers, for teams who need reliable chat support without the complexity
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Everything you need for customer support
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Voxora provides all the tools your team needs to deliver exceptional customer support. 
                From real-time messaging to advanced analytics, we've got you covered.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-8">
                <div className="bg-card rounded-lg p-6 shadow-lg">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-primary rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium">Support Agent</div>
                      <div className="text-xs text-muted-foreground">Online</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-muted rounded-lg p-3 max-w-xs">
                      <p className="text-sm">Hi! How can I help you today?</p>
                    </div>
                    <div className="bg-primary rounded-lg p-3 max-w-xs ml-auto text-primary-foreground">
                      <p className="text-sm">I need help with my account</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 max-w-xs">
                      <p className="text-sm">I'd be happy to help! Let me look into that for you.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of teams already using Voxora to provide exceptional customer support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
              <Link href="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">V</span>
              </div>
              <span className="font-bold text-foreground">Voxora</span>
            </div>
            
            <div className="flex space-x-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
              <Link href="/contact" className="hover:text-foreground">Contact</Link>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 Voxora. All rights reserved. Made with ❤️ by the open source community.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
