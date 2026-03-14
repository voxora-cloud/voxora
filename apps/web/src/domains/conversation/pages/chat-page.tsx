import { useParams } from "react-router";
import { ConversationView } from "../components/conversation-view";

export function ConversationChatPage() {
  const params = useParams();
  const conversationId = params.conversationId || "";

  if (!conversationId) {
    return null;
  }

  return <ConversationView conversationId={conversationId} />;
}
