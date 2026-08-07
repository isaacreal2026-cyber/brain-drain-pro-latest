import { useEffect, useState } from "react";
import { useLocation } from "wouter";

/**
 * A lightweight top-of-page route transition indicator. Uses a CSS keyframe
 * animation instead of framer-motion so it can stay on the critical path
 * without pulling in a 130kB animation library.
 */
export function ConnectionLoader() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 900);
    return () => clearTimeout(timer);
  }, [location]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 w-full h-[3px] z-[100] overflow-hidden bg-transparent pointer-events-none"
      aria-hidden
    >
      <div
        className="h-full w-1/3 bg-primary shadow-[0_0_10px_hsl(var(--primary))]"
        style={{ animation: "bd-loader 0.9s ease-out forwards" }}
      />
      <style>{`
        @keyframes bd-loader {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes bd-loader {
            0%, 100% { transform: translateX(0); opacity: 0.6; }
          }
        }
      `}</style>
    </div>
  );
}
