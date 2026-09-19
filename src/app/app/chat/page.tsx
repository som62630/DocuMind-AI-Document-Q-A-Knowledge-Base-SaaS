import { auth } from "@clerk/nextjs/server";
import { Building2 } from "lucide-react";
import { getConversationsAction, getMessagesAction } from "@/lib/actions/chat";
import { ChatWindow } from "@/components/chat-window";

interface ChatPageProps {
  searchParams?: { id?: string }
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const { orgId } = auth();

  if (!orgId) {
    return (
      <div className="mx-auto max-w-2xl text-center py-12 flex flex-col items-center gap-6">
        <Building2 className="h-16 w-16 text-indigo-400 opacity-20" />
        <h2 className="text-xl font-semibold text-white">
          Select an organization to access the chat room.
        </h2>
      </div>
    );
  }

  // Load all conversations for the sidebar
  const convsResult = await getConversationsAction();
  const conversations = convsResult.success && convsResult.conversations
    ? convsResult.conversations
    : [];

  // Optionally load messages for a specific conversation from query params
  const activeId = searchParams?.id;
  let initialMessages = [];

  if (activeId) {
    const msgsResult = await getMessagesAction(activeId);
    if (msgsResult.success && msgsResult.messages) {
      initialMessages = msgsResult.messages;
    }
  }

  return (
    <div className="h-[calc(100vh-5rem)] max-w-7xl mx-auto">
      <ChatWindow
        initialConversations={conversations}
        initialMessages={initialMessages}
        initialConversationId={activeId}
      />
    </div>
  );
}
