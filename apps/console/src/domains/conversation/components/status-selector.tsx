import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/shared/ui/select";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Circle } from "lucide-react";
import { useUpdateConversationStatus } from "../hooks";

interface StatusSelectorProps {
  conversationId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
}

const statusConfig = {
  open:     { label: "Open",     color: "bg-green-100 text-green-700" },
  resolved: { label: "Resolved", color: "bg-blue-100 text-blue-700" },
  closed:   { label: "Closed",   color: "bg-zinc-100 text-zinc-600" },
};

export function StatusSelector({
  conversationId,
  currentStatus,
  onStatusChange,
}: StatusSelectorProps) {
  const [status, setStatus] = useState(currentStatus);
  const [updating, setUpdating] = useState(false);
  const updateStatus = useUpdateConversationStatus();

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status) return;

    setUpdating(true);
    try {
      await updateStatus.mutateAsync({ conversationId, status: newStatus });
      setStatus(newStatus);
      onStatusChange?.(newStatus);
      toast.success(
        `Status updated to ${statusConfig[newStatus as keyof typeof statusConfig].label}`,
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to update status");
      setStatus(currentStatus);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (currentStat: string) => {
    switch (currentStat) {
      case "resolved":
        return <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 mr-2 shrink-0" />;
      case "closed":
        return <XCircle className="h-3.5 w-3.5 text-zinc-500 mr-2 shrink-0" />;
      default: // open
        return <Circle className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/20 mr-2 shrink-0" />;
    }
  };

  return (
    <Select value={status} onValueChange={handleStatusChange} disabled={updating}>
      <SelectTrigger 
        className="h-9 w-28 px-3 flex items-center justify-center border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer [&>svg:last-child]:hidden shadow-sm text-xs font-semibold"
        title={`Change Status (Current: ${statusConfig[status as keyof typeof statusConfig]?.label || status})`}
      >
        <div className="flex items-center justify-center">
          {getStatusIcon(status)}
          <span>{statusConfig[status as keyof typeof statusConfig]?.label || status}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(statusConfig).map(([key, config]) => (
          <SelectItem key={key} value={key}>
            <span className={`px-2 py-1 rounded ${config.color}`}>
              {config.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
