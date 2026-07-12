import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { idb } from "@/lib/db";
import { getAnalyticsEvents, trackEvent } from "@/lib/analytics";
import { rankNotificationsByRelevance } from "@/lib/recommendations";
import { Notification } from "@/lib/types";
import { useEffect } from "react";

const STORE = "notifications";

export function useNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: [STORE],
    queryFn: async () => {
      const allNotifications = await idb.getAll<Notification>(STORE);
      const analyticsEvents = await getAnalyticsEvents();
      return rankNotificationsByRelevance(allNotifications, analyticsEvents);
    },
  });

  const { mutateAsync: markAsRead } = useMutation({
    mutationFn: async (id: string) => {
      const notification = await idb.get<Notification>(STORE, id);
      if (notification) {
        await idb.put(STORE, { ...notification, read: true });
        await trackEvent("notification_opened", {
          notificationId: id,
          type: notification.type,
          hadPostId: Boolean(notification.postId),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORE] });
    },
  });

  const { mutateAsync: markAllAsRead } = useMutation({
    mutationFn: async () => {
      const all = await idb.getAll<Notification>(STORE);
      for (const n of all) {
        if (!n.read) {
          await idb.put(STORE, { ...n, read: true });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STORE] });
    },
  });

  // Seed data
  useEffect(() => {
    const seed = async () => {
      const existing = await idb.getAll(STORE);
      if (existing.length === 0) {
        const seedData: Notification[] = [
          {
            id: "notif-1",
            type: "reply",
            actorName: "Sarah Chen",
            content: "replied to your post in 'AI Safety'",
            read: false,
            createdAt: Date.now() - 1000 * 60 * 5, // 5 mins ago
          },
          {
            id: "notif-2",
            type: "mention",
            actorName: "Marcus Wright",
            content: "mentioned you in a comment",
            read: false,
            createdAt: Date.now() - 1000 * 60 * 60, // 1 hour ago
          },
          {
            id: "notif-3",
            type: "reaction",
            actorName: "Elena Rodriguez",
            content: "loved your brain 'Medical Diagnosis'",
            read: true,
            createdAt: Date.now() - 1000 * 60 * 60 * 2,
          },
          {
            id: "notif-4",
            type: "brain_run",
            actorName: "Anonymous",
            content: "ran your 'Coffee Recommender' brain",
            read: false,
            createdAt: Date.now() - 1000 * 60 * 60 * 5,
          },
          {
            id: "notif-5",
            type: "reply",
            actorName: "David Kim",
            content: "replied to your comment",
            read: true,
            createdAt: Date.now() - 1000 * 60 * 60 * 24,
          },
        ];

        for (const n of seedData) {
          await idb.put(STORE, n);
        }
        queryClient.invalidateQueries({ queryKey: [STORE] });
      }
    };
    seed();
  }, [queryClient]);

  return {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
}
