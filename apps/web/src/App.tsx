import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { apiClient } from "@/shared/lib/api-client";
import { useAuthStore } from "@/domains/auth/store/auth.store";

interface BootstrapResponse {
  success: boolean;
  data: {
    bootstrapRequired: boolean;
  };
}

const App = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const setAdminRegistered = useAuthStore((state) => state.setAdminRegistered);

  useEffect(() => {
    let isMounted = true;

    const checkBootstrap = async () => {
      try {
        const response = await apiClient.get<BootstrapResponse>(
          "/auth/bootstrap-status",
        );
        if (!isMounted) return;
        
        const isAdminRegistered = !response.data.bootstrapRequired;
        setAdminRegistered(isAdminRegistered);

        const target = response.data.bootstrapRequired
          ? "/auth/setup"
          : "/auth/login";
        navigate(target, { replace: true });
      } catch {
        if (!isMounted) return;
        
        setAdminRegistered(true); // Default to true on error to be safe
        navigate("/auth/login", { replace: true });
      } finally {
        if (isMounted) setIsChecking(false);
      }
    };

    checkBootstrap();

    return () => {
      isMounted = false;
    };
  }, [navigate, setAdminRegistered]);

  if (isChecking) {
    return null;
  }

  return null;
};

export default App;