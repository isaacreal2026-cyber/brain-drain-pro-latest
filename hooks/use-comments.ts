import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { idb } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";
import { Comment, Post } from "@/lib/types";

const STORE = "comments";

const uuidv4 = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export interface CommentWithChildren extends Comment {
  children: CommentWithChildren[];
}

export function useComments(postId?: string) {
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: [STORE, "post", postId],
    queryFn: () => idb.getAllByIndex<Comment>(STORE, "postId", postId as string),
    enabled: Boolean(postId),
  });

  const buildCommentTree = (sourceComments: Comment[]): CommentWithChildren[] => {
    const commentMap: Record<string, CommentWithChildren> = {};
    const roots: CommentWithChildren[] = [];

    sourceComments.forEach((comment) => {
      commentMap[comment.id] = { ...comment, children: [] };
    });

    sourceComments.forEach((comment) => {
      const node = commentMap[comment.id];
      if (comment.parentId && commentMap[comment.parentId]) {
        commentMap[comment.parentId].children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortNodes = (nodes: CommentWithChildren[]) => {
      nodes.sort((a, b) => b.createdAt - a.createdAt);
      nodes.forEach((node) => sortNodes(node.children));
    };
    sortNodes(roots);

    return roots;
  };

  const { mutateAsync: addComment } = useMutation({
    mutationFn: async ({ postId: targetPostId, parentId, content, authorName }: { postId: string; parentId: string | null; content: string; authorName: string }) => {
      const newComment: Comment = {
        id: uuidv4(),
        postId: targetPostId,
        parentId,
        content,
        authorName,
        reactions: {},
        createdAt: Date.now(),
      };
      await idb.put(STORE, newComment);

      const post = await idb.get<Post>("posts", targetPostId);
      if (post) {
        await idb.put("posts", {
          ...post,
          commentCount: (post.commentCount || 0) + 1,
        });
      }

      await trackEvent("comment_created", {
        postId: targetPostId,
        isReply: Boolean(parentId),
        contentLength: content.length,
      });

      return newComment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [STORE, "post", variables.postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const { mutateAsync: reactToComment } = useMutation({
    mutationFn: async ({ id, type, postId: targetPostId }: { id: string; type: string; postId: string }) => {
      const comment = await idb.get<Comment>(STORE, id);
      if (comment) {
        const reactions = { ...comment.reactions };
        reactions[type] = (reactions[type] || 0) + 1;
        await idb.put(STORE, { ...comment, reactions });
        await trackEvent("comment_reaction", {
          postId: targetPostId,
          commentId: id,
          reactionType: type,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [STORE, "post", variables.postId] });
    },
  });

  return {
    comments,
    isLoadingComments,
    buildCommentTree,
    addComment,
    reactToComment,
  };
}
