import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { idb } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";
import { Conversation, Message } from "@/lib/types";
import { useEffect } from "react";

const STORES = {
  MESSAGES: "messages",
  CONVERSATIONS: "conversations",
};

export function useMessages() {
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: [STORES.CONVERSATIONS],
    queryFn: () => idb.getAll<Conversation>(STORES.CONVERSATIONS),
  });

  const { mutateAsync: addMessage } = useMutation({
    mutationFn: async (message: Message) => {
      await idb.put(STORES.MESSAGES, message);
      // Update conversation last message
      const conversation = await idb.get<Conversation>(STORES.CONVERSATIONS, message.conversationId);
      if (conversation) {
        await idb.put(STORES.CONVERSATIONS, {
          ...conversation,
          lastMessage: message.content,
          lastMessageAt: message.createdAt,
        });
      }
      await trackEvent("message_sent", {
        conversationId: message.conversationId,
        contentLength: message.content.length,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORES.MESSAGES] });
      queryClient.invalidateQueries({ queryKey: [STORES.CONVERSATIONS] });
    },
  });

  const getMessages = (conversationId: string) => {
    return useQuery({
      queryKey: [STORES.MESSAGES, conversationId],
      queryFn: () => idb.getAllByIndex<Message>(STORES.MESSAGES, "conversationId", conversationId),
    });
  };

  // Seed data
  useEffect(() => {
    const seed = async () => {
      const existing = await idb.getAll(STORES.CONVERSATIONS);
      if (existing.length === 0) {
        const convs: Conversation[] = [
          {
            id: "conv-1",
            participantIds: ["user-1", "user-2"],
            lastMessage: "Hey, how is the brain builder coming along?",
            lastMessageAt: Date.now() - 3600000,
            unreadCount: 1,
          },
          {
            id: "conv-2",
            participantIds: ["user-1", "user-3"],
            lastMessage: "I just shared a new brain with you!",
            lastMessageAt: Date.now() - 7200000,
            unreadCount: 0,
          },
        ];

        const msgs: Message[] = [
          {
            id: "msg-1",
            conversationId: "conv-1",
            senderId: "user-2",
            content: "Hey, how is the brain builder coming along?",
            createdAt: Date.now() - 3600000,
          },
          {
            id: "msg-2",
            conversationId: "conv-2",
            senderId: "user-3",
            content: "I just shared a new brain with you!",
            createdAt: Date.now() - 7200000,
          },
        ];

        for (const c of convs) await idb.put(STORES.CONVERSATIONS, c);
        for (const m of msgs) await idb.put(STORES.MESSAGES, m);
        
        queryClient.invalidateQueries({ queryKey: [STORES.CONVERSATIONS] });
        queryClient.invalidateQueries({ queryKey: [STORES.MESSAGES] });
      }
    };
    seed();
  }, [queryClient]);

  return {
    conversations,
    isLoadingConversations,
    getMessages,
    addMessage,
  };
}
