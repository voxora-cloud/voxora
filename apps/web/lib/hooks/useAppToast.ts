import { toast } from "sonner";

/**
 * Centralized toast notification hook.
 * Wraps sonner's toast() with typed, consistent helpers.
 * The X close button is handled globally by the Toaster component.
 *
 * Usage:
 *   import { useAppToast } from "@/lib/hooks/useAppToast";
 *   const { toastSuccess, toastError } = useAppToast();
 *   toastSuccess("Agent created successfully");
 *   toastError("Failed to update team");
 */
export function useAppToast() {
  const toastSuccess = (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 2000,
    });
  };

  const toastError = (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 2000,
    });
  };

  const toastInfo = (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 2000,
    });
  };

  return { toastSuccess, toastError, toastInfo };
}
