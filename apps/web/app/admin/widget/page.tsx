"use client"

import React, { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from 'next/navigation'
import { apiService, CreateWidgetData } from '@/lib/api'
import Image from 'next/image'
import { 
  Save,
  Loader2,
  X,
  MessageCircle
} from "lucide-react"

export default function CreateWidgetPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isExistingWidget, setIsExistingWidget] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [formData, setFormData] = useState<CreateWidgetData>({
    displayName: '',
    backgroundColor: '#ffffff',
    logoUrl: ''
  })

  // Handle input changes
  const handleInputChange = (field: keyof CreateWidgetData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getWidget = async () => {
    try {
      const response = await apiService.getWidget()
      if (response.success) {
        setFormData(response.data)
        setIsExistingWidget(true)
      } else {
        setMessage({ type: 'error', text: 'Failed to load widget data' })
      }
    } catch (error) {
      console.error('Error fetching widget data:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to load widget data' 
      })
    }
  }

  useEffect(() => {
    getWidget()
  }, [])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.displayName.trim()) {
      setMessage({ type: 'error', text: 'Display name is required' })
      return
    }

    if (!formData.backgroundColor.trim()) {
      setMessage({ type: 'error', text: 'Background color is required' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const response = isExistingWidget 
        ? await apiService.updateWidget(formData)
        : await apiService.createWidget(formData)
      
      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: isExistingWidget ? 'Widget updated successfully!' : 'Widget created successfully!' 
        })
        setTimeout(() => {
          router.push('/admin/widget') // Redirect to widgets list page
        }, 1500)
      } else {
        setMessage({ 
          type: 'error', 
          text: isExistingWidget ? 'Failed to update widget' : 'Failed to create widget' 
        })
      }
    } catch (error) {
      console.error('Error saving widget:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save widget' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">
            Widget Configuration
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Customize your chat widget appearance and configure visitor experience
          </p>
        </div>
      </div>

      {/* Full Width Configuration Panel */}
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Widget Settings
            </h2>
            <p className="text-gray-600">
              Configure how your widget appears to visitors on your website
            </p>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mb-8 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Display Name */}
                <div className="space-y-3">
                  <Label htmlFor="displayName" className="text-sm font-medium text-gray-900">
                    Brand Name *
                  </Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="e.g., Acme Support, Customer Care"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    className="h-12 text-base"
                    required
                  />
                  <p className="text-sm text-gray-500">
                    This name will appear in the widget header
                  </p>
                </div>

                {/* Background Color */}
                <div className="space-y-3">
                  <Label htmlFor="backgroundColor" className="text-sm font-medium text-gray-900">
                    Brand Color *
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={formData.backgroundColor}
                      onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                      className="w-16 h-12 rounded-lg border cursor-pointer"
                      required
                    />
                    <Input
                      type="text"
                      placeholder="#6366f1"
                      value={formData.backgroundColor}
                      onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                      className="flex-1 h-12 text-base"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Primary color for buttons and highlights
                  </p>
                </div>

                {/* Logo URL */}
                <div className="space-y-3">
                  <Label htmlFor="logoUrl" className="text-sm font-medium text-gray-900">
                    Brand Logo
                  </Label>
                  <Input
                    id="logoUrl"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={formData.logoUrl}
                    onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                    className="h-12 text-base"
                  />
                  <p className="text-sm text-gray-500">
                    Logo URL (recommended: square format, 64x64px minimum)
                  </p>
                </div>
              </div>

              {/* Right Column - Preview */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Widget Preview</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    This is how your widget button will appear on your website
                  </p>
                </div>

                {/* Chat Button Preview */}
                <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 border-2 border-dashed border-gray-300">
                  <div className="text-center mb-4">
                    <p className="text-xs text-gray-500">Your website content</p>
                  </div>
                  
                  <div className="absolute bottom-4 left-4">
                    <button
                      className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center group"
                      style={{ backgroundColor: formData.backgroundColor }}
                    >
                      {formData.logoUrl ? (
                        <Image
                          unoptimized
                          src={formData.logoUrl}
                          alt="Logo"
                          width={24}
                          height={24}
                          className="object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <MessageCircle className="w-6 h-6 text-white" />
                      )}
                      
                      {/* Online Badge */}
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                    </button>
                  </div>
                </div>

                {/* Widget Info */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Widget Features:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Contact form collection</li>
                    <li>• Real-time messaging</li>
                    <li>• Agent status indicators</li>
                    <li>• Mobile responsive design</li>
                    <li>• Customizable branding</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-10 pt-8 border-t border-gray-200">
              <div className="flex gap-4 justify-center">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 h-12 text-base font-medium"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      {isExistingWidget ? 'Update Widget' : 'Create Widget'}
                    </>
                  )}
                </Button>
                
                {isExistingWidget && (
                  <Button
                    type="button"
                    variant="outline"
                    className="px-8 h-12 text-base"
                    size="lg"
                    onClick={() => {
                      setFormData({
                        displayName: '',
                        backgroundColor: '#6366f1',
                        logoUrl: ''
                      })
                      setIsExistingWidget(false)
                    }}
                  >
                    Reset to Defaults
                  </Button>
                )}
              </div>
            </div>
          </form>

          {/* Integration Instructions */}
          <div className="mt-10 pt-8 border-t border-gray-200">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-medium text-gray-900 mb-3">Integration Code</h3>
              <p className="text-sm text-gray-600 mb-4">
                Add this code to your website to enable the chat widget:
              </p>
              <code className="block text-sm bg-gray-800 text-green-400 p-4 rounded-lg font-mono overflow-x-auto">
                {`<script src="https://widget.voxora.com/widget.js" 
        data-widget-id="${isExistingWidget ? 'your-widget-id' : 'will-be-generated'}"></script>`}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chat Widget - Real Demo */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Chat Button */}
        <button
          onClick={() => setIsChatOpen(true)}
          className="w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center group"
          style={{ backgroundColor: formData.backgroundColor }}
        >
          {formData.logoUrl ? (
            <Image
              unoptimized
              src={formData.logoUrl}
              alt="Logo"
              width={28}
              height={28}
              className="object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <MessageCircle className="w-7 h-7 text-white" />
          )}
          {/* Online Badge */}
          <div className="absolute -top-1 -left-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
        </button>
      </div>

      {/* Chat Popup Overlay - Contact Form Preview */}
      {isChatOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-[99] animate-fade-in"
            onClick={() => setIsChatOpen(false)}
          />
          {/* Popup */}
          <div className="fixed bottom-8 right-8 z-[100] w-[350px] max-w-[95vw] animate-slide-up">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
              {/* Header */}
              <div 
                className="px-6 py-4 text-white relative flex items-center justify-between"
                style={{ backgroundColor: formData.backgroundColor }}
              >
                <div className="flex items-center gap-3">
                  {formData.logoUrl ? (
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                      <Image 
                        unoptimized
                        src={formData.logoUrl} 
                        alt="Logo" 
                        width={32}
                        height={32}
                        className="object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-base">
                      {formData.displayName || 'Customer Support'}
                    </h4>
                    <div className="flex items-center gap-1 text-sm opacity-90">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>We&apos;re online</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Contact Form */}
              <div className="p-6 bg-gray-50 flex-1 flex flex-col justify-center">
                <div className="mb-4">
                  <h5 className="font-medium text-gray-900 mb-2">Start a conversation</h5>
                  <p className="text-sm text-gray-600 mb-4">
                    We usually respond within a few minutes
                  </p>
                </div>
                <form className="space-y-4">
                  {/* Name Field */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {/* Email Field */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {/* Phone Field */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="Enter your phone"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {/* Start Chat Button */}
                  <button
                    type="button"
                    className="w-full py-3 text-white font-medium rounded-lg transition-colors hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ backgroundColor: formData.backgroundColor }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Start Conversation
                  </button>
                </form>
                {/* Privacy Notice */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    We respect your privacy. Your information is secure and never shared.
                  </p>
                </div>
                <div className="mt-2 text-center">
                  <span className="text-xs text-gray-400">Powered by </span>
                  <span className="text-xs font-semibold" style={{ color: formData.backgroundColor }}>
                    Voxora
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
