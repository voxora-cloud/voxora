"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { apiService, User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<void>;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    companyName: string;
  }) => Promise<void>;
  acceptInvite: (token: string, password?: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = apiService.getToken();
    const savedUser = apiService.getUser();

    if (token && savedUser) {
      setUser(savedUser);
    }

    setIsLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string
  ) => {
    try {
      // Unified login endpoint handles both admin and agent
      const response = await apiService.login({ email, password });

      if (response.success && response.data) {
        if (response.data.requiresOrgSelection) {
          // Store memberships temporarily for the /select-org page
          if (typeof window !== "undefined") {
            localStorage.setItem("tempAuthUser", JSON.stringify(response.data.user));
            localStorage.setItem("tempMemberships", JSON.stringify(response.data.memberships));
            if (response.data.selectionToken) {
              apiService.setToken(response.data.selectionToken);
            }
            window.location.href = "/select-org";
          }
          return;
        }

        // Single org — auto-logged in
        const { user, accessToken, role, organization } = response.data;
        if (accessToken) apiService.setToken(accessToken);
        if (organization?._id) apiService.setActiveOrgId(organization._id);
        if (role) apiService.setOrgRole(role);

        apiService.setUser(user);
        setUser(user);

        // Redirect to unified admin dashboard for all roles
        window.location.href = "/admin";
      } else {
        throw new Error(response.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const signup = async (data: {
    name: string;
    email: string;
    password: string;
    companyName: string;
  }) => {
    try {
      const response = await apiService.adminSignup({
        name: data.name,
        email: data.email,
        password: data.password,
        organizationName: data.companyName,
      });

      if (response.success && response.data) {
        const { user, accessToken, role, organization } = response.data;
        if (accessToken) apiService.setToken(accessToken);
        if (organization?._id) apiService.setActiveOrgId(organization._id);
        if (role) apiService.setOrgRole(role);

        apiService.setUser(user);
        setUser(user);

        // Redirect to admin dashboard
        window.location.href = "/admin";
      } else {
        throw new Error(response.message || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
    window.location.href = "/login";
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    apiService.setUser(updatedUser);
  };

  const acceptInvite = async (token: string, password?: string) => {
    console.log("Accepting invite with token:", token);
    const response = await apiService.acceptInvite(token, password);
    console.log("Accept invite API response:", response);

    if (response.success && response.data) {
      return true;
    } else {
      // Throw error with the message from the API
      throw new Error(response.message || "Failed to accept invitation");
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    acceptInvite,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
