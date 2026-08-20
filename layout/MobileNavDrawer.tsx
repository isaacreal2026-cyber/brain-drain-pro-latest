import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  sections: NavSection[];
  currentPath: string;
  onLinkClick: (href: string, e: React.MouseEvent) => void;
}

/**
 * Mobile "More" bottom sheet. Items are grouped into clearly-labeled
 * sections (Explore / Account) so settings and profile aren't mixed in with
 * primary navigation.
 */
export function MobileNavDrawer({
  open,
  onClose,
  sections,
  currentPath,
  onLinkClick,
}: MobileNavDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="md:hidden fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            className="md:hidden fixed bottom-0 left-0 right-0 z-[70] bg-card rounded-t-3xl border-t border-border/50 p-6 pb-10 max-h-[80vh] overflow-y-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
          >
            <div className="flex items-center justify-between mb-6">
              <span className="font-bold text-lg">More</span>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Close menu"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-6">
              {sections.map((section) => (
                <nav key={section.label} aria-label={section.label}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">
                    {section.label}
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    {section.items.map((item) => {
                      const isActive = currentPath === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={(e) => {
                            onLinkClick(item.href, e);
                            onClose();
                          }}
                          aria-current={isActive ? "page" : undefined}
                          className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
                        >
                          <div
                            className={cn(
                              "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer",
                              isActive
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent/50",
                            )}
                          >
                            <item.icon className="w-7 h-7" aria-hidden />
                            <span className="text-xs font-semibold text-center leading-tight">{item.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </nav>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
