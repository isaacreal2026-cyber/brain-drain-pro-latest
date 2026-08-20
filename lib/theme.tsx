import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  // Storage can throw when cookies/site data are blocked (private mode,
  // embedded webviews) — that must never stop the app from rendering.
  const readStoredTheme = (): Theme | null => {
    try {
      return localStorage.getItem(storageKey) as Theme | null;
    } catch {
      return null;
    }
  };

  const [theme, setTheme] = useState<Theme>(() => readStoredTheme() || defaultTheme);

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (next: Theme) => {
      root.classList.remove("light", "dark");
      if (next === "system") {
        root.classList.add(
          window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
        );
        return;
      }
      root.classList.add(next);
    };

    applyTheme(theme);

    if (theme !== "system") return;

    // Follow the OS while "system" is selected; previously the appearance was
    // frozen at whatever the OS was when the page loaded.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      try {
        localStorage.setItem(storageKey, theme);
      } catch {
        // Preference cannot be persisted; keep it for this session.
      }
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
