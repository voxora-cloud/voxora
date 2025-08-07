"use client"

import React, { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useRouter } from 'next/navigation'
import { apiService, CreateWidgetData, UpdateWidgetData } from '@/lib/api'
import Image from 'next/image'
import { 
  ArrowLeft,
  Palette,
  ImageIcon,
  Type,
  Save,
  Loader2
} from "lucide-react"

export default function CreateWidgetPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isExistingWidget, setIsExistingWidget] = useState(false)
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

  // Preview widget
  const WidgetPreview = () => (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      <h3 className="text-lg font-semibold mb-4">Widget Preview</h3>
      
      {/* Chatbot Widget Preview */}
      <div className="relative max-w-sm mx-auto">
        {/* Chat Widget Button */}
        <div 
          className="inline-flex items-center gap-3 p-4 rounded-full shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
          style={{ backgroundColor: formData.backgroundColor }}
        >
          {formData.logoUrl && (
            <img 
              src={formData.logoUrl} 
              alt="Logo" 
              width={24}
              height={24}
              className="object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          )}
          <div className="text-white font-medium text-sm">
            {formData.displayName || 'Chat Support'}
          </div>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        </div>
        
        {/* Chat Window Preview */}
        <div className="mt-4 bg-white rounded-lg shadow-xl border overflow-hidden max-w-80 mx-auto">
          {/* Chat Header */}
          <div 
            className="p-4 text-white flex items-center gap-3"
            style={{ backgroundColor: formData.backgroundColor }}
          >
            {formData.logoUrl && (
              <img 
                src={formData.logoUrl} 
                alt="Logo" 
                width={32}
                height={32}
                className="object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}
            <div>
              <div className="font-semibold text-sm">
                {formData.displayName || 'Support Team'}
              </div>
              <div className="text-xs opacity-90 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Online
              </div>
            </div>
          </div>
          
          {/* Chat Messages */}
          <div className="p-4 bg-gray-50 min-h-[120px] space-y-3">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs">
                AI
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm max-w-[80%]">
                <p className="text-sm text-gray-800">
                  Hi! How can I help you today?
                </p>
                <span className="text-xs text-gray-500 mt-1 block">just now</span>
              </div>
            </div>
            
            <div className="flex justify-end">
              <div 
                className="rounded-lg p-3 max-w-[80%] text-white text-sm"
                style={{ backgroundColor: formData.backgroundColor }}
              >
                Hello, I need help with my account
              </div>
            </div>
          </div>
          
          {/* Chat Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-500">
                Type a message...
              </div>
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white cursor-pointer"
                style={{ backgroundColor: formData.backgroundColor }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isExistingWidget ? 'Update Widget' : 'Create New Widget'}
              </h1>
              <p className="text-gray-600">Configure your chat widget settings</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Widget Configuration
              </CardTitle>
              <CardDescription>
                Set up your chat widget appearance and branding
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Message Display */}
              {message && (
                <div className={`mb-4 p-3 rounded-lg ${
                  message.type === 'success' 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {message.text}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Display Name *
                  </Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="e.g., Support Chat, Customer Service"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    required
                  />
                  <p className="text-sm text-gray-500">
                    This will be shown to visitors on your website
                  </p>
                </div>

                {/* Background Color */}
                <div className="space-y-2">
                  <Label htmlFor="backgroundColor" className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Background Color *
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={formData.backgroundColor}
                      onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                      className="w-16 h-10 rounded border"
                      required
                    />
                    <Input
                      type="text"
                      placeholder="#ffffff"
                      value={formData.backgroundColor}
                      onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                      className="flex-1"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Choose a color that matches your brand
                  </p>
                </div>

                {/* Logo URL */}
                <div className="space-y-2">
                  <Label htmlFor="logoUrl" className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Logo URL (Optional)
                  </Label>
                  <Input
                    id="logoUrl"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={formData.logoUrl}
                    onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    URL to your company logo (recommended: 32x32px)
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isLoading ? 'Saving...' : (isExistingWidget ? 'Update Widget' : 'Create Widget')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                See how your widget will appear to visitors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WidgetPreview />
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Widget Features:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Responsive design for all devices</li>
                  <li>• Real-time messaging capabilities</li>
                  <li>• Agent status indicators</li>
                  <li>• File upload support</li>
                  <li>• Customizable branding & themes</li>
                  <li>• Typing indicators</li>
                  <li>• Message read receipts</li>
                  <li>• Offline message collection</li>
                </ul>
              </div>
              
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Integration:</h4>
                <p className="text-sm text-green-800 mb-2">
                  Copy this code to your website:
                </p>
                <code className="block text-xs bg-green-100 p-2 rounded font-mono text-green-900 overflow-x-auto">
                  {`<script src="https://widget.voxora.com/widget.js" data-widget-id="your-widget-id"></script>`}
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
