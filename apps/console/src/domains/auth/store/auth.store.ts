import type { Organization, User } from "@/shared/types/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LoginPayload, SignupPayload } from "../types/types";
import { authApi } from "../api/auth.api";

interface AuthState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (loginPayload: LoginPayload) => Promise<void>;
  signup: (signupPayload: SignupPayload) => Promise<void>;
  acceptInvite: (token: string, password?: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: User) => void;
  setOrganization: (org: Organization | null) => void;
  initializeAuth: () => Promise<void>;
  completeSignup: (data: any) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => {
      const completeSignupAction = async (data: any, errorMessage = "Signup completion failed") => {
        try {
          const response = await authApi.completeSignup(data);

          if (response.success && response.data) {
            const { user, accessToken, role, organization: signupOrg } = response.data;

            if (accessToken) authApi.setToken(accessToken);
            if (signupOrg?._id) authApi.setActiveOrgId(signupOrg._id);
            if (role) authApi.setOrgRole(role);
            if (signupOrg?.plan) authApi.setOrgPlan(signupOrg.plan);

            authApi.setUser(user);
            set({
              user,
              organization: signupOrg,
              isAuthenticated: true,
            });

            // Redirect to dashboard
            window.location.href = "/dashboard";
            return;
          }

          throw new Error(response.message || errorMessage);
        } catch (error) {
          console.error("Complete signup error:", error);
          throw error;
        }
      };

      return {
      user: null,
      organization: null,
      isLoading: false,
      isAuthenticated: false,

      initializeAuth: async () => {
        set({ isLoading: true });
        try {
          const token = authApi.getToken();
          const savedUser = authApi.getUser();

          if (token && savedUser) {
            set({ user: savedUser, isAuthenticated: true });

            // Sync organization data from persisted Zustand state to localStorage
            const state = useAuthStore.getState();
            if (state.organization?._id) {
              authApi.setActiveOrgId(state.organization._id);
            }
          }
        } catch (error) {
          console.error("Failed to initialize auth:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (loginPayload: LoginPayload) => {
        try {
          const response = await authApi.login(loginPayload);

          if (response.success && response.data) {
            if (response.data.requiresOrgSelection) {
              // Store memberships temporarily for the /select-org page
              if (typeof window !== "undefined") {
                localStorage.setItem("tempAuthUser", JSON.stringify(response.data.user));
                localStorage.setItem("tempMemberships", JSON.stringify(response.data.memberships));
                if (response.data.selectionToken) {
                  authApi.setToken(response.data.selectionToken);
                }
                window.location.href = "/select-org";
              }
              return;
            }

            // Single org — auto-logged in
            const { user, accessToken, role, organization: loginOrg } = response.data;

            if (accessToken) authApi.setToken(accessToken);
            if (loginOrg?._id) authApi.setActiveOrgId(loginOrg._id);
            if (role) authApi.setOrgRole(role);
            if (loginOrg?.plan) authApi.setOrgPlan(loginOrg.plan);

            authApi.setUser(user);
            set({
              user,
              organization: loginOrg || null,
              isAuthenticated: true
            });

            // Redirect to dashboard
            window.location.href = "/dashboard";
          } else {
            throw new Error(response.message || "Login failed");
          }
        } catch (error) {
          console.error("Login error:", error);
          throw error;
        }
      },

      signup: async (signupPayload: SignupPayload) => {
        return completeSignupAction(signupPayload, "Signup failed");
      },

      acceptInvite: async (token: string, password?: string) => {
        try {
          console.log("Accepting invite with token:", token);
          const response = await authApi.acceptInvite(token, password);

          console.log("Accept invite API response:", response);

          if (response.success && response.data) {
            return true;
          } else {
            throw new Error(response.message || "Failed to accept invitation");
          }
        } catch (error) {
          console.error("Accept invite error:", error);
          throw error;
        }
      },

      logout: () => {
        authApi.removeToken();
        authApi.removeOrgData();
        set({
          user: null,
          organization: null,
          isAuthenticated: false
        });
        window.location.href = "/auth/login";
      },

      updateUser: (user: User) => {
        authApi.setUser(user);
        set({ user });
      },

      setOrganization: (org: Organization | null) => {
        set({ organization: org });
        if (org?._id) {
          authApi.setActiveOrgId(org._id);
        }
        if (org?.plan) {
          authApi.setOrgPlan(org.plan);
        }
      },
      completeSignup: async (data: any) => {
        return completeSignupAction(data, "Signup completion failed");
      },

    };
    },
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Sync organization ID to localStorage after rehydration
        if (state?.organization?._id) {
          authApi.setActiveOrgId(state.organization._id);
        }
        if (state?.organization?.plan) {
          authApi.setOrgPlan(state.organization.plan);
        }
      },
    }
  )
);