"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { apiService, User, Organization } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  setOrganization: (org: Organization | null) => void;
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
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      // Check if user is already logged in
      const token = apiService.getToken();
      const savedUser = apiService.getUser();

      if (token && savedUser) {
        setUser(savedUser);

        // Fetch organization details if logged in
        const activeOrgId = apiService.getActiveOrgId();
        if (activeOrgId) {
          try {
            const orgResponse = await apiService.getOrganization(activeOrgId);
            if (orgResponse.success && orgResponse.data) {
              setOrganization(orgResponse.data.organization);
            }
          } catch (error) {
            console.error("Failed to load organization in auth context:", error);
          }
        }
      }

      setIsLoading(false);
    }

    initAuth();
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
        const { user, accessToken, role, organization: loginOrg } = response.data;
        if (accessToken) apiService.setToken(accessToken);
        if (loginOrg?._id) apiService.setActiveOrgId(loginOrg._id);
        if (role) apiService.setOrgRole(role);

        apiService.setUser(user);
        setUser(user);
        if (loginOrg) setOrganization(loginOrg);

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
        const { user, accessToken, role, organization: signupOrg } = response.data;
        if (accessToken) apiService.setToken(accessToken);
        if (signupOrg?._id) apiService.setActiveOrgId(signupOrg._id);
        if (role) apiService.setOrgRole(role);

        apiService.setUser(user);
        setUser(user);
        if (signupOrg) setOrganization(signupOrg);

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
    setOrganization(null);
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
    organization,
    setOrganization,
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
