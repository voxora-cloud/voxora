import { useAuthStore } from "../store/auth.store";

/**
 * Hook to access auth state and user information
 * Use this for reading auth state in components
 */
export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const organization = useAuthStore((state) => state.organization);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const updateUser = useAuthStore((state) => state.updateUser);
  const setOrganization = useAuthStore((state) => state.setOrganization);

  return {
    user,
    organization,
    isAuthenticated,
    isLoading,
    updateUser,
    setOrganization,
  };
};
