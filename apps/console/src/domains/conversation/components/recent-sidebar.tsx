import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Clock, Trash2, ChevronLeft, ChevronRight, MessageSquare, Mail, Send, Phone } from "lucide-react";
import { conversationsApi } from "../api/conversations.api";

interface RecentConversation {
  _id: string;
  subject: string;
  visitorName: string;
  channel: string;
  lastMessage?: string;
  openedAt: number;
}

export function RecentConversationsSidebar() {
  const navigate = useNavigate();
  const { conversationId: activeId } = useParams();
  const [recents, setRecents] = useState<RecentConversation[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const loadRecents = async () => {
    try {
      const res = await conversationsApi.getRecentConversations();
      if (res?.success && Array.isArray(res.data)) {
        setRecents(res.data);
      } else {
        setRecents([]);
      }
    } catch (err) {
      console.error("Failed to load recent conversations:", err);
    }
  };

  useEffect(() => {
    loadRecents();
    window.addEventListener("interaone_recents_updated", loadRecents);
    return () => {
      window.removeEventListener("interaone_recents_updated", loadRecents);
    };
  }, []);

  const clearRecents = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await conversationsApi.clearRecentConversations();
      if (res?.success) {
        setRecents([]);
      }
    } catch (err) {
      console.error("Failed to clear recent conversations:", err);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel?.toLowerCase()) {
      case "email":
        return <Mail className="h-2.5 w-2.5 shrink-0" />;
      case "telegram":
        return <Send className="h-2.5 w-2.5 shrink-0 rotate-[-30deg]" />;
      case "whatsapp":
        return <Phone className="h-2.5 w-2.5 shrink-0" />;
      default:
        return <MessageSquare className="h-2.5 w-2.5 shrink-0" />;
    }
  };

  const formatRecentTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (compareDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (compareDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (isCollapsed) {
    return (
      <div className="h-full w-14 flex flex-col bg-card border-r border-border items-center pt-3 pb-3 transition-all duration-300">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 hover:bg-muted rounded-lg cursor-pointer mb-5 text-muted-foreground hover:text-foreground transition-all duration-200 shadow-sm border border-transparent hover:border-border"
          title="Expand Sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        
        <div className="flex-1 flex flex-col gap-3.5 items-center w-full overflow-y-auto px-2 scrollbar-none">
          {recents.map((conv) => {
            const initials = conv.visitorName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const isActive = conv._id === activeId;
            return (
              <div key={conv._id} className="relative shrink-0 group">
                <button
                  onClick={() => navigate(`/dashboard/conversations/inbox/chat/${conv._id}`)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer border relative transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/20"
                      : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                  }`}
                  title={conv.visitorName}
                >
                  {initials}
                </button>
                {/* Channel Icon Badge */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border text-[8px] shadow-sm ${
                  isActive 
                    ? "bg-card text-primary border-primary" 
                    : "bg-background text-muted-foreground border-border"
                }`}>
                  {getChannelIcon(conv.channel)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-[260px] flex flex-col bg-card border-r border-border transition-all duration-300">
      {/* Header */}
      <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0 text-primary/80" />
          <span className="text-xs font-bold tracking-wider uppercase select-none text-foreground/80">Recents</span>
        </div>
        <div className="flex items-center gap-1.5">
          {recents.length > 0 && (
            <button
              onClick={clearRecents}
              className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:border-destructive/20"
              title="Clear Recents"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:border-border"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {recents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-9 h-9 rounded-full bg-muted/40 flex items-center justify-center mb-3">
              <Clock className="h-4.5 w-4.5 text-muted-foreground/60" />
            </div>
            <p className="text-xs text-muted-foreground font-semibold">No recent chats</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-relaxed">Chats you view will show up here.</p>
          </div>
        ) : (
          recents.map((conv) => {
            const isActive = conv._id === activeId;
            const initials = conv.visitorName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <button
                key={conv._id}
                onClick={() => navigate(`/dashboard/conversations/inbox/chat/${conv._id}`)}
                className={`w-full text-left flex items-center gap-3 py-3 px-3.5 transition-all border-b border-border/40 select-none duration-150 relative ${
                  isActive
                    ? "bg-accent border-b-accent text-accent-foreground shadow-sm"
                    : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/30"
                }`}
              >
                {/* Active Indicator Line */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                )}

                {/* Avatar with Channel Icon Badge */}
                <div className="relative shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold border transition-all duration-150 ${
                    isActive 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "bg-muted text-muted-foreground border-border"
                  }`}>
                    {initials}
                  </div>
                  {/* Channel icon badge */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border text-[8px] shadow-sm ${
                    isActive 
                      ? "bg-card text-primary border-primary" 
                      : "bg-background text-muted-foreground border-border"
                  }`}>
                    {getChannelIcon(conv.channel)}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <p className={`text-xs font-bold truncate text-foreground`}>
                      {conv.visitorName}
                    </p>
                    <span className="text-[9px] text-muted-foreground/75 whitespace-nowrap">
                      {formatRecentTime(conv.openedAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate leading-normal">
                    {conv.lastMessage || "No messages yet"}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
