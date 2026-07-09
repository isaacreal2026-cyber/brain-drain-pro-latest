import { useState, useMemo } from "react";
import { useMessages } from "@/hooks/use-messages";
import { useDatabase } from "@/hooks/use-database";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare, MessageSquarePlus, ArrowLeft, BrainCircuit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Conversation, Message } from "@/lib/types";

export function MessagesPage() {
  const { conversations, getMessages, addMessage } = useMessages();
  const { brains } = useDatabase();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatUser, setNewChatUser] = useState("");

  const favoriteBrains = useMemo(() => brains.filter(b => b.isFavorite), [brains]);
  
  const combinedConversations: Conversation[] = useMemo(() => {
    const brainConvs = favoriteBrains.map(b => ({
      id: `brain-${b.id}`,
      participantIds: [b.title, "me"],
      lastMessage: `Automated push: "Post related to ${b.title} highlights new structural gating."`,
      lastMessageAt: Date.now() - Math.floor(Math.random() * 3600000), // Random recent time
      unreadCount: 1,
      isBrain: true
    }));
    return [...conversations, ...brainConvs];
  }, [conversations, favoriteBrains]);

  const activeConversation = combinedConversations.find((c) => c.id === activeId);
  const isBrainChat = activeId?.startsWith("brain-");

  const { data: realMessages = [] } = getMessages(activeId || "");
  
  const messages: Message[] = useMemo(() => {
    if (isBrainChat) {
      const bTitle = activeConversation?.participantIds[0] || "Brain";
      return [
        {
          id: "sys-1",
          conversationId: activeId!,
          senderId: bTitle,
          content: `System Alert: Post tagged with ${bTitle} updated node constraints. Review cognitive layout.`,
          createdAt: activeConversation?.lastMessageAt || Date.now()
        }
      ];
    }
    return realMessages;
  }, [isBrainChat, realMessages, activeId, activeConversation]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeId) return;
    if (isBrainChat) return; // Cannot send to brain chats
    
    await addMessage({
      id: crypto.randomUUID(),
      conversationId: activeId,
      senderId: "me", // Assuming current user is "me"
      content: newMessage.trim(),
      createdAt: Date.now(),
    });
    setNewMessage("");
  };

  const handleStartConversation = () => {
    if (!newChatUser.trim()) return;
    setActiveId(`new-conv-${Date.now()}`);
    setIsNewChatOpen(false);
    setNewChatUser("");
  };

  const activeView = activeId ? "chat" : "list";

  return (
    <div className="flex h-full max-h-[100dvh] overflow-hidden">
      {/* List Column */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-border/50 flex flex-col ${activeView === "chat" ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h1 className="text-xl font-bold">Mentor Channels</h1>
          <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost">
                <MessageSquarePlus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input 
                  placeholder="Enter username to message..." 
                  value={newChatUser}
                  onChange={(e) => setNewChatUser(e.target.value)}
                />
                <Button className="w-full" onClick={handleStartConversation} disabled={!newChatUser.trim()}>
                  Start Conversation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {combinedConversations.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-4 opacity-20" />
                <p>No conversations yet.</p>
              </div>
            ) : (
              combinedConversations.map((conv) => {
                 const isBrain = conv.id.startsWith("brain-");
                 return (
                <button
                  key={conv.id}
                  onClick={() => setActiveId(conv.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-accent/50 ${
                    activeId === conv.id ? "bg-accent" : ""
                  }`}
                >
                  <Avatar className={isBrain ? "bg-primary/20 text-primary" : ""}>
                    {isBrain ? <BrainCircuit className="w-5 h-5 m-auto" /> : <AvatarFallback>{conv.participantIds.find(id => id !== "me")?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>}
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-semibold text-sm truncate flex items-center gap-1">
                        {conv.participantIds.find((id: string) => id !== "me") || "User"}
                        {isBrain && <span className="text-[10px] text-primary uppercase font-mono tracking-tighter">System Push</span>}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {formatDistanceToNow(conv.lastMessageAt, { addSuffix: true })}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${isBrain ? "text-primary/70 font-mono" : "text-muted-foreground"}`}>{conv.lastMessage}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {conv.unreadCount}
                    </div>
                  )}
                </button>
               );
            }))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Column */}
      <div className={`flex-1 flex flex-col bg-background ${activeView === "list" ? "hidden md:flex" : "flex"}`}>
        {activeId ? (
          <>
            <div className="h-16 border-b border-border/50 flex items-center px-4 gap-3">
              <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setActiveId(null)}>
                 <ArrowLeft className="w-5 h-5" />
              </Button>
              <Avatar className={`w-8 h-8 ${isBrainChat ? 'bg-primary/20 text-primary' : ''}`}>
                 {isBrainChat ? <BrainCircuit className="w-4 h-4 m-auto" /> : <AvatarFallback>{activeConversation?.participantIds.find((id: string) => id !== "me")?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>}
              </Avatar>
              <span className="font-semibold">{activeConversation?.participantIds.find((id: string) => id !== "me") || (activeId.startsWith('new-conv') ? "New User" : "User")}</span>
              {isBrainChat && <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-md font-mono uppercase tracking-widest ml-2">Brain Push Channel</span>}
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isMe = msg.senderId === "me";
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                          isBrainChat
                            ? "bg-primary/10 text-primary border border-primary/20 font-mono"
                            : isMe 
                              ? "bg-primary text-primary-foreground rounded-tr-sm" 
                              : "bg-muted text-foreground rounded-tl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-border/50 bg-background">
              {isBrainChat ? (
                <div className="text-center text-xs text-muted-foreground font-mono bg-muted/30 p-3 rounded-md">
                   This is an automated cognitive push channel. Replies are disabled.
                </div>
              ) : (
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex gap-2"
                >
                  <Input 
                    placeholder="Type a message..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquarePlus className="w-12 h-12 mb-4 opacity-20" />
            <p>Select a conversation or start a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}
