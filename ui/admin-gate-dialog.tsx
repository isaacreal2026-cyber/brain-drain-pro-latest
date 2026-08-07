import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADMIN_CONFIRM_PHRASE, matchesAdminPhrase } from "@/lib/admin-gate";

interface AdminGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Short title for the destructive action, e.g. "Refresh local data". */
  title: string;
  /** Explains what will happen once authorized. */
  description: string;
  /** Called only after the user types the exact phrase and confirms. */
  onConfirm: () => void | Promise<void>;
  confirmLabel?: string;
  /** In-flight state for the action running after authorization. */
  busy?: boolean;
}

/**
 * A confirmation dialog that requires the operator to type the admin
 * pass-phrase before a destructive action runs. This prevents accidental
 * data wipes while making the requirement explicit and accessible.
 */
export function AdminGateDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = "I understand — continue",
  busy = false,
}: AdminGateDialogProps) {
  const [phrase, setPhrase] = useState("");

  useEffect(() => {
    if (!open) setPhrase("");
  }, [open]);

  const matches = matchesAdminPhrase(phrase);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <KeyRound className="h-5 w-5" />
          </div>
          <DialogTitle className="text-center text-lg">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="admin-phrase" className="text-sm">
            Type <span className="font-mono font-semibold text-foreground">{ADMIN_CONFIRM_PHRASE}</span> to confirm
          </Label>
          <Input
            id="admin-phrase"
            autoFocus
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches && !busy) {
                e.preventDefault();
                void onConfirm();
              }
            }}
            placeholder={ADMIN_CONFIRM_PHRASE}
            aria-invalid={phrase.length > 0 && !matches}
            className="font-mono"
          />
          {phrase.length > 0 && !matches && (
            <p className="text-xs text-destructive">
              Phrase does not match yet.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={!matches || busy}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
