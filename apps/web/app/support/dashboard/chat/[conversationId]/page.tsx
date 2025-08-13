import { ConversationView } from "@/components/chat/conversation-view";
import { use } from "react";

interface PageProps {
  params: Promise<{
    conversationId: string;
  }>;
}

export default function ChatPage({ params }: PageProps) {
  const { conversationId } = use(params);

  return (
    <div className="h-full w-full">
      <ConversationView conversationId={conversationId} />
    </div>
  );
}
