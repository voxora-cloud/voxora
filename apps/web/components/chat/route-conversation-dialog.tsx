"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Team {
  _id: string;
  name: string;
}

interface Agent {
  _id: string;
  name: string;
  email: string;
}

interface RouteConversationDialogProps {
  conversationId: string;
  onRouted?: () => void;
}

export function RouteConversationDialog({
  conversationId,
  onRouted,
}: RouteConversationDialogProps) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingAgents, setFetchingAgents] = useState(false);

  // Fetch teams on mount
  useEffect(() => {
    if (open) {
      fetchTeams();
    }
  }, [open]);

  // Fetch agents when team is selected
  useEffect(() => {
    if (selectedTeam) {
      fetchAgents(selectedTeam);
    } else {
      setAgents([]);
      setSelectedAgent("");
    }
  }, [selectedTeam]);

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/agent/teams`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTeams(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    }
  };

  const fetchAgents = async (teamId: string) => {
    try {
      setFetchingAgents(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/agent/teams/${teamId}/members`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAgents(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setFetchingAgents(false);
    }
  };

  const handleRoute = async () => {
    if (!selectedTeam && !selectedAgent) {
      toast.error("Please select a team or agent");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/conversations/${conversationId}/route`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            teamId: selectedTeam || undefined,
            agentId: selectedAgent && selectedAgent !== "auto-assign" ? selectedAgent : undefined,
            reason: reason || undefined,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(`Conversation routed to ${data.data.agentName || "team"}`);
        setOpen(false);
        onRouted?.();
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to route conversation");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to route conversation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Route
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Route Conversation</DialogTitle>
          <DialogDescription>
            Transfer this conversation to another team or agent
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="team">Team</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger id="team">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team._id} value={team._id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="agent">Agent (Optional)</Label>
            <Select
              value={selectedAgent}
              onValueChange={setSelectedAgent}
              disabled={!selectedTeam || fetchingAgents}
            >
              <SelectTrigger id="agent">
                <SelectValue placeholder={fetchingAgents ? "Loading..." : "Auto-assign or select"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto-assign">Auto-assign</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent._id} value={agent._id}>
                    {agent.name} ({agent.email})
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
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleRoute} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Route Conversation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
