import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouteConversation } from "../hooks";
import { useAgents } from "@/domains/agent/hooks";

interface RouteConversationDialogProps {
  conversationId: string;
  onRouted?: () => void;
}

export function RouteConversationDialog({
  conversationId,
  onRouted,
}: RouteConversationDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: agents = [], isLoading: isAgentsLoading } = useAgents();
  const routeMutation = useRouteConversation();



  const handleRoute = async () => {
    if (!selectedAgent) {
      toast.error("Please select an agent");
      return;
    }

    setLoading(true);
    try {
      const response = await routeMutation.mutateAsync({
        conversationId,
        agentId:
          selectedAgent && selectedAgent !== "auto-assign"
            ? selectedAgent
            : undefined,
        reason: reason || undefined,
      });

      toast.success(`Conversation routed to ${response.data.agentName || "agent"}`);
      setOpen(false);
      onRouted?.();
    } catch (error: any) {
      toast.error(error?.message || "Failed to route conversation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="cursor-pointer">
          <UserPlus className="h-4 w-4 mr-2" />
          Route
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Route Conversation</DialogTitle>
          <DialogDescription>
            Transfer this conversation to another agent
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="agent">Agent</Label>
            <Select
              value={selectedAgent}
              onValueChange={setSelectedAgent}
              disabled={isAgentsLoading}
            >
              <SelectTrigger id="agent" className="cursor-pointer">
                <SelectValue
                  placeholder={isAgentsLoading ? "Loading..." : "Auto-assign or select"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto-assign">Auto-assign (least busy)</SelectItem>
                {agents.map((agent: any) => (
                  <SelectItem key={agent.user._id} value={agent.user._id}>
                    {agent.user.name} ({agent.user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why are you routing this conversation?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="cursor-text"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button onClick={handleRoute} disabled={loading} className="cursor-pointer">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Route Conversation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
