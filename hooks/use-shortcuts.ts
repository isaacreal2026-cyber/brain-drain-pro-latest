import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/hooks/use-toast";

export function useShortcuts() {
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  useEffect(() => {
    let keySequence = "";
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Handle Command/Ctrl + K for search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setLocation("/search");
        return;
      }

      // Handle Command/Ctrl + \ for theme toggle
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        toast({
          title: "Theme changed",
          description: `Switched to ${newTheme} mode.`,
        });
        return;
      }

      // Navigation sequences
      keySequence += e.key.toLowerCase();
      
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        keySequence = "";
      }, 1000);

      const navMap: Record<string, string> = {
        "gh": "/",
        "gl": "/library",
        "gc": "/community",
        "gm": "/messages",
        "gp": "/profile",
        "gs": "/settings",
        "gn": "/notifications",
        "gf": "/missions"
      };

      if (keySequence === "?") {
        e.preventDefault();
        toast({
          title: "Keyboard Shortcuts",
          description: "Cmd/Ctrl+K: Search | Cmd/Ctrl+\\: Toggle Theme | g+[h/l/c/m/p/s/n/f]: Navigate | ?: Help",
          duration: 5000,
        });
        keySequence = "";
      } else if (navMap[keySequence]) {
        e.preventDefault();
        setLocation(navMap[keySequence]);
        keySequence = "";
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeout);
    };
  }, [setLocation, theme, setTheme, toast]);
}
