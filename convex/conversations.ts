import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create or get existing conversation (ORDER SAFE)
 */
export const createOrGetConversation = mutation({
  args: {
    currentUserId: v.id("users"),
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Always sort participants
    const participants = [
      args.currentUserId,
      args.otherUserId,
    ].sort();

    const existingConversations = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q) =>
        q.eq("participants", participants)
      )
      .collect();

    const existing = existingConversations.find(
      (convo) => !convo.isGroup
    );

    if (existing) return existing._id;

    return await ctx.db.insert("conversations", {
      participants,
      lastMessage: "",
      lastMessageAt: Date.now(),
      isGroup: false,
      createdBy: args.currentUserId,
      isPinned: false,
    });
  },
});

/**
 * Get user conversations with unread count
 */
export const getUserConversations = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversations = await ctx.db
      .query("conversations")
      .collect();

    const result = [];

    for (const convo of conversations) {
      if (!convo.participants.includes(args.userId)) {
        continue;
      }

      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", convo._id)
        )
        .collect();

      const unreadCount = messages.filter(
        (m) => !m.readBy.includes(args.userId)
      ).length;

      result.push({
        ...convo,
        unreadCount,
      });
    }

    return result;
  },
});

/**
 * Add message to a conversation
 */
export const addMessageToConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    // Insert new message
    const message = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      body: args.body,
      createdAt: Date.now(),
      readBy: [args.senderId],
      isDeleted: false,
      reactions: [],
    });

    // Update last message and time in the conversation
    await ctx.db.patch(args.conversationId, {
      lastMessage: args.body,
      lastMessageAt: Date.now(),
    });

    return message;
  },
});

/**
 * Update read status of a message
 */
export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Mark message as read by adding the user to the readBy array
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const msg of messages) {
      if (!msg.readBy.includes(args.userId)) {
        await ctx.db.patch(msg._id, {
          readBy: [...msg.readBy, args.userId],
        });
      }
    }

    return "Messages marked as read";
  },
});

/**
 * Create a group conversation
 */
export const createGroupConversation = mutation({
  args: {
    currentUserId: v.id("users"),
    participants: v.array(v.id("users")),
    groupName: v.string(),
  },
  handler: async (ctx, args) => {
    const participantSet = new Set(args.participants);
    participantSet.add(args.currentUserId);
    const participantsSorted = Array.from(participantSet).sort();

    // Check if the same group conversation already exists
    const existingConversations = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q) =>
        q.eq("participants", participantsSorted)
      )
      .collect();

    const existing = existingConversations.find(
      (convo) =>
        convo.isGroup &&
        convo.groupName === args.groupName
    );

    if (existing) return existing._id;

    // Create a new group conversation
    return await ctx.db.insert("conversations", {
      participants: participantsSorted,
      lastMessage: "",
      lastMessageAt: Date.now(),
      isGroup: true,
      groupName: args.groupName,
      createdBy: args.currentUserId,
      isPinned: false,
    });
  },
});

/**
 * Toggle pin status for a conversation
 */
export const togglePin = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new Error("Conversation not found.");
    }

    if (!conversation.participants.includes(args.userId)) {
      throw new Error("Not authorized to pin this conversation.");
    }

    const nextPinned = !(conversation.isPinned ?? false);
    await ctx.db.patch(args.conversationId, { isPinned: nextPinned });
    return nextPinned;
  },
});
