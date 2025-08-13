"use client";

import { useState, useEffect } from "react";

interface StatusIndicatorProps {
  status: "online" | "offline" | "busy" | "away";
  showText?: boolean;
}

export function StatusIndicator({
  status,
  showText = false,
}: StatusIndicatorProps) {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    if (status === "busy") {
      const interval = setInterval(() => {
        setIsBlinking((prev) => !prev);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const getStatusConfig = () => {
    switch (status) {
      case "online":
        return {
          color: "bg-green-500",
          text: "Online",
          textColor: "text-green-600",
        };
      case "busy":
        return {
          color: `${isBlinking ? "bg-yellow-500" : "bg-yellow-300"}`,
          text: "Busy",
          textColor: "text-yellow-600",
        };
      case "away":
        return {
          color: "bg-orange-500",
          text: "Away",
          textColor: "text-orange-600",
        };
      case "offline":
      default:
        return {
          color: "bg-gray-500",
          text: "Offline",
          textColor: "text-gray-600",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center space-x-2">
      <div
        className={`w-2 h-2 rounded-full ${config.color} transition-colors duration-300`}
      />
      {showText && (
        <span className={`text-xs font-medium ${config.textColor}`}>
          {config.text}
        </span>
      )}
    </div>
  );
}

export function Badge({
  children,
  variant = "default",
  className = "",
  ...props
}: {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}) {
  const variantClasses = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    outline: "border border-border bg-background",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
