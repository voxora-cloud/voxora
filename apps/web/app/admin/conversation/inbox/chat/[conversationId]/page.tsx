"use client";

import { useParams } from "next/navigation";
import { ConversationView } from "@/components/chat/conversation-view";

export default function AdminChatPage() {
    const params = useParams();
    const conversationId = params.conversationId as string;

    return <ConversationView conversationId={conversationId} />;
}
