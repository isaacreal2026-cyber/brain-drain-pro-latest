import { useState } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCheck, MessageCircle, Heart, Zap, AtSign } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation } from "wouter";

export function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState("all");
  const [, setLocation] = useLocation();

  const filteredNotifications = notifications.filter(n => {
    if (filter === "unread") return !n.read;
    if (filter === "mentions") return n.type === "mention";
    return true;
  }).sort((a, b) => b.createdAt - a.createdAt);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "reply": return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case "reaction": return <Heart className="w-4 h-4 text-red-500" />;
      case "brain_run": return <Zap className="w-4 h-4 text-yellow-500" />;
      case "mention": return <AtSign className="w-4 h-4 text-green-500" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const handleNotificationClick = (notif: any) => {
    if (!notif.read) markAsRead(notif.id);
    
    // Direct to the attached activity
    if (notif.postId) {
      setLocation(`/?postId=${notif.postId}`);
    } else if (notif.type === "brain_run") {
      setLocation("/library");
    } else {
      setLocation("/");
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col bg-background">
      {/* Sticky Header with blurred background */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 pb-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">Notifications</h1>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full h-8 text-xs font-bold border-border cursor-pointer"
            onClick={() => markAllAsRead()} 
            disabled={unreadCount === 0}
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
            Mark all read
          </Button>
        </div>
        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className="w-full rounded-none border-b border-border/40 bg-transparent h-12 p-0 overflow-x-auto flex-nowrap scrollbar-none justify-start">
            <TabsTrigger 
              value="all" 
              className="flex-1 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-extrabold data-[state=active]:border-b-[3px] data-[state=active]:border-primary h-full px-4 text-sm text-muted-foreground hover:bg-muted/10 transition-all cursor-pointer"
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="unread" 
              className="flex-1 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-extrabold data-[state=active]:border-b-[3px] data-[state=active]:border-primary h-full px-4 text-sm text-muted-foreground hover:bg-muted/10 transition-all cursor-pointer"
            >
              Unread
              {unreadCount > 0 && (
                <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="mentions" 
              className="flex-1 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:font-extrabold data-[state=active]:border-b-[3px] data-[state=active]:border-primary h-full px-4 text-sm text-muted-foreground hover:bg-muted/10 transition-all cursor-pointer"
            >
              Mentions
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/50">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p>No notifications found.</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-4 hover:bg-accent/30 transition-colors flex gap-4 cursor-pointer ${!notif.read ? 'bg-accent/10' : ''}`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="relative">
                  <Avatar>
                    <AvatarFallback>{notif.actorName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border border-border">
                    {getIcon(notif.type)}
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm">
                    <span className="font-semibold">{notif.actorName}</span> {notif.content}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(notif.createdAt, { addSuffix: true })}
                  </p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
