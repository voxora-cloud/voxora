"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Mail, Lock, User, Building, Globe, Briefcase, AlertCircle } from "lucide-react"
import { useAuth } from "./auth-context"
import Link from "next/link"

interface FounderData {
  // Step 1: Account
  name: string
  email: string
  password: string
  confirmPassword: string
  // Step 2: Company
  companyName: string
  companyWebsite: string
  industry: string
}

export function FounderOnboarding() {
  const { signup } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [formData, setFormData] = useState<FounderData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    companyWebsite: "",
    industry: ""
  })

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
    "Other"
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleNext = async () => {
    setError("")
    
    if (currentStep === 1) {
      // Validate step 1
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        setError("Please fill in all fields")
        return
      }
      
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords don't match!")
        return
      }
      
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters long")
        return
      }
      
      setCurrentStep(2)
    } else {
      // Validate step 2 and submit
      if (!formData.companyName) {
        setError("Company name is required")
        return
      }
      
      setIsLoading(true)
      try {
        await signup({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          companyName: formData.companyName
        })
      } catch (error) {
        setError(error instanceof Error ? error.message : "Registration failed")
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleBack = () => {
    setCurrentStep(1)
    setError("")
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">V</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            {currentStep === 1 ? "Create Founder Account" : "Company Information"}
          </CardTitle>
          <CardDescription className="text-center">
            {currentStep === 1 
              ? "Start your Voxora journey as a founder" 
              : "Tell us about your company"
            }
          </CardDescription>
          
          {/* Progress Indicator */}
          <div className="flex space-x-2 pt-4">
            <div className={`flex-1 h-2 rounded-full ${currentStep >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex-1 h-2 rounded-full ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {currentStep === 1 ? (
            // Step 1: Account Information
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
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
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
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
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
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
                    className="pl-10 pr-10"
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
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
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
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Step 2: Company Information
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="companyName" className="text-sm font-medium text-foreground">
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
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="companyWebsite" className="text-sm font-medium text-foreground">
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
                <label htmlFor="industry" className="text-sm font-medium text-foreground">
                  Industry
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <select
                    id="industry"
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Select your industry</option>
                    {industries.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
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
              {isLoading ? "Creating Account..." : currentStep === 1 ? "Continue" : "Complete Setup"}
            </Button>
          </div>

          {currentStep === 1 && (
            <div className="text-center text-sm text-muted-foreground pt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
