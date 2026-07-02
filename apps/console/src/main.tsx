import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router";
import router from "./router/index.tsx";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./shared/lib/query-client.ts";
import { ThemeProvider } from "./shared/theme/theme-provider.tsx";
import { Toaster } from "./shared/ui/sonner.tsx";
import { apiClient } from "./shared/lib/api-client.ts";
import { setInteraOneMode } from "./shared/ee/index.ts";

const bootApp = async () => {
  try {
    const res = await apiClient.get<{ data?: { mode?: "cloud" | "self-host" } }>("/config");
    if (res?.data?.mode) {
      setInteraOneMode(res.data.mode);
    }
  } catch (error) {
    console.warn("[Boot] Failed to load remote system config, defaulting to cached/self-host mode:", error);
  } finally {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Toaster />
          </QueryClientProvider>
        </ThemeProvider>
      </StrictMode>,
    );
  }
};

void bootApp();