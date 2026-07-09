import { useState } from "react";
import { useComments, CommentWithChildren } from "@/hooks/use-comments";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Reply } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CommentThreadProps {
  postId: string;
}

export function CommentThread({ postId }: CommentThreadProps) {
  const { getCommentsForPost, buildCommentTree, addComment, reactToComment } = useComments();
  const { data: comments = [], isLoading } = getCommentsForPost(postId);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [content, setContent] = useState("");

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground text-center">Loading comments...</div>;
  }

  const commentTree = buildCommentTree(comments);

  const handleSubmit = async (e: React.FormEvent, parentId: string | null) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    await addComment({
      postId,
      parentId,
      content,
      authorName: "Me", // Mock user
    });
    
    setContent("");
    setReplyToId(null);
  };

  const CommentNode = ({ node, depth = 0 }: { node: CommentWithChildren; depth?: number }) => {
    const isReplying = replyToId === node.id;
    const maxDepth = 3;
    const paddingLeft = Math.min(depth, maxDepth) * 1.5;

    return (
      <div className="flex flex-col gap-2 mt-4" style={{ paddingLeft: `${paddingLeft}rem` }}>
        <div className="flex gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs bg-primary/20 text-primary">
              {node.authorName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-sm">{node.authorName}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(node.createdAt, { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{node.content}</p>
            <div className="flex items-center gap-4 pt-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 gap-1 text-muted-foreground hover:text-destructive text-xs"
                onClick={() => reactToComment({ id: node.id, type: "love", postId })}
              >
                <Heart className="w-3 h-3" />
                {node.reactions?.love || 0}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 gap-1 text-muted-foreground text-xs"
                onClick={() => setReplyToId(isReplying ? null : node.id)}
              >
                <Reply className="w-3 h-3" />
                Reply
              </Button>
            </div>
            
            {isReplying && (
              <form onSubmit={(e) => handleSubmit(e, node.id)} className="mt-2 flex gap-2">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="min-h-[60px] text-sm resize-none"
                  autoFocus
                />
                <Button type="submit" size="sm" className="self-end" disabled={!content.trim()}>
                  Reply
                </Button>
              </form>
            )}
          </div>
        </div>
        
        {node.children.length > 0 && (
          <div className="flex flex-col gap-2">
            {node.children.map(child => (
              <CommentNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pt-4 border-t border-border/50">
      <form onSubmit={(e) => handleSubmit(e, null)} className="flex gap-3 mb-6">
        <Avatar className="w-8 h-8">
          <AvatarFallback className="text-xs bg-primary/20 text-primary">ME</AvatarFallback>
        </Avatar>
        <div className="flex-1 flex gap-2">
          <Textarea
            value={replyToId === null ? content : ""}
            onChange={(e) => {
              if (replyToId !== null) setReplyToId(null);
              setContent(e.target.value);
            }}
            placeholder="Add a comment..."
            className="min-h-[40px] h-[40px] text-sm resize-none py-2"
          />
          <Button type="submit" disabled={!content.trim()}>Post</Button>
        </div>
      </form>

      <div className="space-y-4">
        {commentTree.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first to start the conversation!</p>
        ) : (
          commentTree.map(node => (
            <CommentNode key={node.id} node={node} />
          ))
        )}
      </div>
    </div>
  );
}