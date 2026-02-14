"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";

type StatusType = "success" | "error" | "warning" | "info";

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: StatusType;
  title: string;
  message?: string;
  showCloseButton?: boolean;
  showOkButton?: boolean;
  closeButtonText?: string;
  okButtonText?: string;
  onOkClick?: () => void;
}

const statusConfig = {
  success: {
    icon: CheckCircle2,
    bgColor: "bg-green-100 dark:bg-green-900/20",
    iconColor: "text-green-600 dark:text-green-500",
    titleColor: "text-green-900 dark:text-green-100",
  },
  error: {
    icon: XCircle,
    bgColor: "bg-red-100 dark:bg-red-900/20",
    iconColor: "text-red-600 dark:text-red-500",
    titleColor: "text-red-900 dark:text-red-100",
  },
  warning: {
    icon: AlertCircle,
    bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    iconColor: "text-yellow-600 dark:text-yellow-500",
    titleColor: "text-yellow-900 dark:text-yellow-100",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    iconColor: "text-blue-600 dark:text-blue-500",
    titleColor: "text-blue-900 dark:text-blue-100",
  },
};

export default function StatusModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  showCloseButton = true,
  showOkButton = true,
  closeButtonText = "Close",
  okButtonText = "OK",
  onOkClick,
}: StatusModalProps) {
  const config = statusConfig[type];
  const Icon = config.icon;

  const handleOkClick = () => {
    if (onOkClick) {
      onOkClick();
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          {/* Status Icon */}
          <div
            className={`w-16 h-16 rounded-full ${config.bgColor} flex items-center justify-center`}
          >
            <Icon className={`h-8 w-8 ${config.iconColor}`} />
          </div>

          {/* Title and Message */}
          <div className="space-y-2">
            <h2 className={`text-xl font-semibold ${config.titleColor}`}>
              {title}
            </h2>
            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full pt-2">
            {showCloseButton && (
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 cursor-pointer"
              >
                {closeButtonText}
              </Button>
            )}
            {showOkButton && (
              <Button
                variant={type === "error" ? "destructive" : "default"}
                onClick={handleOkClick}
                className="flex-1 cursor-pointer"
              >
                {okButtonText}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
