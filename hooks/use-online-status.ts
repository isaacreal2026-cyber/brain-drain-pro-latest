import { useEffect, useState } from "react";

type Status = "online" | "offline";

/**
 * Tracks the browser's online/offline state. SSR-safe and updates in real
 * time when the network connection changes.
 */
export function useOnlineStatus(): Status {
  const [status, setStatus] = useState<Status>(() =>
    typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "online",
  );

  useEffect(() => {
    const goOnline = () => setStatus("online");
    const goOffline = () => setStatus("offline");
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return status;
}
