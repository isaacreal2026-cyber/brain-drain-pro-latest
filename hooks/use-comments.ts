import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { idb } from "@/lib/db";
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

export function useComments() {
  const queryClient = useQueryClient();

  const getCommentsForPost = (postId: string) => {
    return useQuery({
      queryKey: [STORE, "post", postId],
      queryFn: () => idb.getAllByIndex<Comment>(STORE, "postId", postId),
    });
  };

  const buildCommentTree = (comments: Comment[]): CommentWithChildren[] => {
    const commentMap: Record<string, CommentWithChildren> = {};
    const roots: CommentWithChildren[] = [];

    // First pass: create nodes
    comments.forEach(comment => {
      commentMap[comment.id] = { ...comment, children: [] };
    });

    // Second pass: link nodes
    comments.forEach(comment => {
      const node = commentMap[comment.id];
      if (comment.parentId && commentMap[comment.parentId]) {
        commentMap[comment.parentId].children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort by date
    const sortNodes = (nodes: CommentWithChildren[]) => {
      nodes.sort((a, b) => b.createdAt - a.createdAt);
      nodes.forEach(node => sortNodes(node.children));
    };
    sortNodes(roots);

    return roots;
  };

  const { mutateAsync: addComment } = useMutation({
    mutationFn: async ({ postId, parentId, content, authorName }: { postId: string, parentId: string | null, content: string, authorName: string }) => {
      const newComment: Comment = {
        id: uuidv4(),
        postId,
        parentId,
        content,
        authorName,
        reactions: {},
        createdAt: Date.now(),
      };
      await idb.put(STORE, newComment);

      const post = await idb.get<Post>("posts", postId);
      if (post) {
        await idb.put("posts", {
          ...post,
          commentCount: (post.commentCount || 0) + 1,
        });
      }

      return newComment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [STORE, "post", variables.postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const { mutateAsync: reactToComment } = useMutation({
    mutationFn: async ({ id, type, postId }: { id: string, type: string, postId: string }) => {
      const comment = await idb.get<Comment>(STORE, id);
      if (comment) {
        const reactions = { ...comment.reactions };
        reactions[type] = (reactions[type] || 0) + 1;
        await idb.put(STORE, { ...comment, reactions });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [STORE, "post", variables.postId] });
    },
  });

  return {
    getCommentsForPost,
    buildCommentTree,
    addComment,
    reactToComment,
  };
}
