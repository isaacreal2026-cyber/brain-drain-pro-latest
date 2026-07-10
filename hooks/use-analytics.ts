import { useEffect } from "react";
import { useLocation } from "wouter";
import { trackEvent } from "@/lib/analytics";

export function useRouteAnalytics() {
  const [location] = useLocation();

  useEffect(() => {
    void trackEvent("page_view", {
      path: location,
      search: typeof window !== "undefined" ? window.location.search : "",
    });
  }, [location]);
}

export function useSessionAnalytics() {
  useEffect(() => {
    void trackEvent("session_start", {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      referrer: document.referrer || "direct",
    });

    const handleVisibilityChange = () => {
      void trackEvent(document.hidden ? "app_hidden" : "app_visible");
    };

    const handlePageHide = () => {
      void trackEvent("session_end");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);
}
