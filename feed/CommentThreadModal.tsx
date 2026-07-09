import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CommentThread } from "./CommentThread";

interface CommentThreadModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  postAuthorName: string;
}

export function CommentThreadModal({ postId, isOpen, onClose, postAuthorName }: CommentThreadModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comments on {postAuthorName}'s post</DialogTitle>
        </DialogHeader>
        <CommentThread postId={postId} />
      </DialogContent>
    </Dialog>
  );
}
