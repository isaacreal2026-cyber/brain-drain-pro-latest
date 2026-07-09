import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export function ConnectionLoader() {
  const [location] = useLocation();
  const [phase, setPhase] = useState<"idle" | "meeting" | "filling" | "complete">("idle");

  useEffect(() => {
    // Start animation on route change
    setPhase("meeting");

    const meetTimer = setTimeout(() => {
      setPhase("filling");
    }, 1200); // Time it takes to meet in the middle

    const completeTimer = setTimeout(() => {
      setPhase("complete");
    }, 2000); // Time it takes to fill the space

    const hideTimer = setTimeout(() => {
      setPhase("idle");
    }, 2400); // Time before hiding completely

    return () => {
      clearTimeout(meetTimer);
      clearTimeout(completeTimer);
      clearTimeout(hideTimer);
    };
  }, [location]);

  if (phase === "idle") return null;

  return (
    <div className="fixed top-0 left-0 w-full h-[3px] z-[100] flex justify-center items-center overflow-hidden bg-transparent">
      <AnimatePresence>
        {phase !== "complete" && (
          <>
            {/* Left moving line */}
            <motion.div
              className="absolute h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]"
              initial={{ left: "0%", width: "0%", x: "-100%" }}
              animate={
                phase === "meeting"
                  ? { left: "50%", width: "20%", x: "-100%" }
                  : { left: "50%", width: "50%", x: "-100%" }
              }
              transition={{
                duration: phase === "meeting" ? 1.2 : 0.8,
                ease: phase === "meeting" ? "circIn" : "circOut",
              }}
            />

            {/* Right moving line */}
            <motion.div
              className="absolute h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]"
              initial={{ right: "0%", width: "0%", x: "100%" }}
              animate={
                phase === "meeting"
                  ? { right: "50%", width: "20%", x: "100%" }
                  : { right: "50%", width: "50%", x: "100%" }
              }
              transition={{
                duration: phase === "meeting" ? 1.2 : 0.8,
                ease: phase === "meeting" ? "circIn" : "circOut",
              }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
