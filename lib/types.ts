export interface BrainVersion {
  id: string;
  brain_id: string;
  branch: string;
  message: string;
  nodes: Node[];
  created_at: number;
}

export interface Branch {
  id: string;
  brain_id: string;
  name: string;
  isMain: boolean;
  parent_version_id?: string;
  created_at: number;
}

export interface PullRequest {
  id: string;
  brain_id: string;
  title: string;
  description: string;
  source_branch: string;
  target_branch: string;
  status: "open" | "merged" | "closed";
  created_at: number;
}

export interface Brain {
  id: string;
  title: string;
  category: string;
  description: string;
  created_at: number;
  root_node_id: string | null;
  repo_status?: "private" | "public_repo";
  active_branch?: string;
  isFavorite?: boolean;
  /** Optional factors captured in the creation wizard. */
  traits?: string[];
}

export interface Node {
  id: string;
  brain_id: string;
  node_type: "question" | "outcome";
  question_text?: string;
  if_true_node_id?: string | null;
  if_false_node_id?: string | null;
  result_text?: string;
  next_steps?: string;
  attachments?: NodeAttachment[];
}

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessage: string;
  lastMessageAt: number;
  unreadCount: number;
  isBrain?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: number;
}

export interface Notification {
  id: string;
  type: "reply" | "mention" | "reaction" | "brain_run";
  actorName: string;
  content: string;
  postId?: string;
  read: boolean;
  createdAt: number;
}

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  authorName: string;
  content: string;
  reactions: Record<string, number>;
  /** Who reacted with what, so a reaction can be taken back. */
  userReactions?: Record<string, string[]>;
  createdAt: number;
}

export interface NodeAttachment {
  type: "image" | "html" | "pdf";
  name: string;
  data: string;
  size: number;
}

export interface BrainData {
  brain: Brain;
  nodes: Node[];
}

export type PostType = "post" | "question" | "answer";

export interface PostEvent {
  title: string;
  startsAt: number;
  endsAt?: number;
  location?: string;
  communityId?: string;
  communityName?: string;
}

export interface Post {
  id: string;
  userId: string;
  topicId: string;
  content: string;
  postType?: PostType;
  event?: PostEvent;
  mediaUrls?: string[];
  brainId?: string; // Optional link to a brain
  reactions: Record<string, number>; // e.g. { "upvote": 10, "downvote": 1 }
  userReactions?: Record<string, string[]>; // e.g. { "upvote": ["user1"], "downvote": ["user2"] }
  commentCount: number;
  repostCount?: number;
  createdAt: number;
}

/**
 * Keeps posts created before the vote UI update readable while new posts use
 * the explicit upvote/downvote keys.
 */
export function getPostUpvoteCount(post: Post): number {
  if (typeof post.reactions?.upvote === "number") return post.reactions.upvote;
  return (post.reactions?.like || 0) + (post.reactions?.love || 0);
}

export function getPostDownvoteCount(post: Post): number {
  return post.reactions?.downvote || 0;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  followerCount: number;
  isFollowed?: boolean;
  order?: number;
  category?: string;
}

export type MissionCategory = "Financial" | "Health" | "Learning" | "Business" | "Creativity" | "Discipline" | "Relationships" | "Other";
export interface Mission {
  id: string;
  title: string;
  description: string;
  category: MissionCategory;
  status: "active" | "completed" | "paused";
  targetDate?: number;
  progress: number; // 0-100
  xpReward: number;
  courseId?: string; // Links to a course if it is part of one
  createdAt: number;
}
export interface Milestone {
  id: string;
  missionId: string;
  title: string;
  completed: boolean;
  completedAt?: number;
  order: number;
  notes?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  authorId: string;
  totalLevels: number;
  enrolled: boolean;
  progress: number; // 0-100
  createdAt: number;
}

export interface Level {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  isUnlocked: boolean;
  isCompleted: boolean;
}

export interface Quiz {
  id: string;
  levelId: string;
  title: string;
  timeLimitSeconds?: number;
  minScoreToPass: number; // 0-100
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  order: number;
}

export interface Reputation {
  id: "me";
  xp: number;
  level: number; // 1-100, calculated from xp
  streak: number; // consecutive active days
  lastActiveDate: string; // ISO date string YYYY-MM-DD
  totalMissionsCompleted: number;
  totalBrainsCreated: number;
  totalCheckIns: number;
  badges: string[];
}
export interface XPEvent {
  id: string;
  type: "mission_created" | "milestone_completed" | "mission_completed" | "brain_created" | "check_in" | "post_created" | "comment" | "brain_shared";
  xpGained: number;
  description: string;
  createdAt: number;
}
export interface CircleCheckIn {
  id: string;
  circleId: string;
  userId: string;
  message: string;
  moodScore: number; // 1-5
  createdAt: number;
  upvotes?: number;
  downvotes?: number;
  replies?: { id: string; userId: string; content: string; createdAt: number }[];
  linkedBrainId?: string;
}
export interface Pathway {
  id: string;
  title: string;
  description: string;
  category: string;
  brainIds: string[]; // ordered list of brain IDs in this pathway
  forkedFromId?: string;
  authorId: string;
  forkCount: number;
  createdAt: number;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  image?: string;
  memberCount: number;
  isJoined?: boolean;
  checkInCount?: number;
  weeklyGoal?: string;
  memberNames?: string[];
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  followerCount: number;
  followingCount: number;
  pinnedDetails?: string;
  category?: "Blogger" | "Political Figure" | "Creator" | "Artist" | "Business" | "Developer" | "Student" | "Researcher" | "Public Figure" | "Personal" | "Other";
  personalDetails?: {
    location?: string;
    birthday?: string;
    gender?: string;
    languages?: string[];
    websiteLinks?: string[];
    socialLinks?: string[];
  };
  family?: {
    spouse?: string;
    parents?: string[];
    children?: string[];
    siblings?: string[];
  };
  tags?: {
    pets?: string[];
    sports?: string[];
    movies?: string[];
    instruments?: string[];
  };
  bookmarkedPostIds?: string[];
  collections?: PostCollection[];
  hiddenPostIds?: string[];
  reportedPostIds?: string[];
  followingIds?: string[];
}

export interface PostCollection {
  id: string;
  name: string;
  postIds: string[];
}

export interface AppSettings {
  theme: "light" | "dark" | "system";
  notificationsEnabled: boolean;
}

export interface BrainDNA {
  id: string;
  brainId: string;
  parentBrainId?: string;
  childBrainIds: string[];
  linkedBrainIds: string[];
}

export interface LibraryBook {
  id: string;
  title: string;
  story: string;
  imageUrl?: string;
  status: 'Draft' | 'Under Review' | 'Published';
  createdAt: number;
}
