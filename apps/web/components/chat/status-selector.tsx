"use client";

import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Edit } from "lucide-react";

interface StatusSelectorProps {
  conversationId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
}

const statusConfig = {
  open: { label: "Open", color: "bg-green-100 text-green-700" },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  resolved: { label: "Resolved", color: "bg-blue-100 text-blue-700" },
};

export function StatusSelector({
  conversationId,
  currentStatus,
  onStatusChange,
}: StatusSelectorProps) {
  const [status, setStatus] = useState(currentStatus);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/conversations/${conversationId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        setStatus(newStatus);
        onStatusChange?.(newStatus);
        toast.success(`Status updated to ${statusConfig[newStatus as keyof typeof statusConfig].label}`);
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to update status");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
      // Revert status
      setStatus(currentStatus);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Select value={status} onValueChange={handleStatusChange} disabled={updating}>
      <SelectTrigger className="h-9 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground w-auto">
        <Edit className="h-4 w-4 mr-2" />
        {statusConfig[status as keyof typeof statusConfig]?.label || "Status"}
      </SelectTrigger>
      <SelectContent>
        {Object.entries(statusConfig).map(([key, config]) => (
          <SelectItem key={key} value={key}>
            <span className={`px-2 py-1 rounded ${config.color}`}>{config.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
