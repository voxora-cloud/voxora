import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { apiClient } from "@/shared/lib/api-client";

interface BootstrapResponse {
  success: boolean;
  data: {
    bootstrapRequired: boolean;
  };
}

const App = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkBootstrap = async () => {
      try {
        const response = await apiClient.get<BootstrapResponse>(
          "/auth/bootstrap-status",
        );
        if (!isMounted) return;
        const target = response.data.bootstrapRequired
          ? "/auth/setup"
          : "/auth/login";
        navigate(target, { replace: true });
      } catch {
        if (!isMounted) return;
        navigate("/auth/login", { replace: true });
      } finally {
        if (isMounted) setIsChecking(false);
      }
    };

    checkBootstrap();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (isChecking) {
    return null;
  }

  return null;
};

export default App;