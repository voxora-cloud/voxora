"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { apiService, User } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string, loginType?: 'admin' | 'agent') => Promise<void>
  signup: (data: { name: string; email: string; password: string; companyName: string }) => Promise<void>
  acceptInvite: (token: string) => Promise<boolean>
  logout: () => void
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const token = apiService.getToken()
    const savedUser = apiService.getUser()
    
    if (token && savedUser) {
      setUser(savedUser)
    }
    
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string, loginType: 'admin' | 'agent' = 'admin') => {
    try {
      let response
      
      if (loginType === 'admin') {
        response = await apiService.adminLogin({ email, password })
      } else {
        response = await apiService.agentLogin({ email, password })
      }

      if (response.success && response.data) {
        const { user, token } = response.data
        apiService.setToken(token)
        apiService.setUser(user)
        setUser(user)
        
        // Redirect based on role
        if (user.role === 'admin') {
          window.location.href = '/admin'
        } else if (user.role === 'agent') {
          window.location.href = '/support/dashboard'
        }
      } else {
        throw new Error(response.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const signup = async (data: { name: string; email: string; password: string; companyName: string }) => {
    try {
      const response = await apiService.adminSignup(data)
      
      if (response.success && response.data) {
        const { user, token } = response.data
        apiService.setToken(token)
        apiService.setUser(user)
        setUser(user)
        
        // Redirect to admin dashboard
        window.location.href = '/admin'
      } else {
        throw new Error(response.message || 'Signup failed')
      }
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    }
  }

  const logout = () => {
    apiService.logout()
    setUser(null)
  }

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
    apiService.setUser(updatedUser)
  }
  
  const acceptInvite = async (token: string) =>  {
    try {
      console.log('Accepting invite with token:', token)
      const response = await apiService.acceptInvite(token)
      console.log('Accept invite API response:', response)
      
      if (response.success && response.data) {
         return true
      } else {
        console.error('Failed to accept invite:', response.message || 'Unknown error')
         // If we know the database updated correctly, we could force true here
         return false
      }
    } catch (error) {
      console.error('Accept invite error:', error)
      return false
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    acceptInvite,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
