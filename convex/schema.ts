import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  /* =====================================================
     USERS TABLE
  ===================================================== */
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.string(),
  })
    .index("by_clerkId", ["clerkId"]),


  /* =====================================================
     CONVERSATIONS TABLE
  ===================================================== */
  conversations: defineTable({
    participants: v.array(v.id("users")),

    // Direct or Group
    isGroup: v.boolean(),
    groupName: v.optional(v.string()),
    createdBy: v.id("users"),

    // Sidebar preview
    lastMessage: v.string(),
    lastMessageAt: v.number(),
    lastMessageSenderId: v.optional(v.id("users")),

    // Advanced features
    isPinned: v.optional(v.boolean()),
  })
    .index("by_participants", ["participants"]),


  /* =====================================================
     MESSAGES TABLE
  ===================================================== */
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),

    body: v.string(),
    createdAt: v.number(),

    // Seen tracking
    readBy: v.array(v.id("users")),

    // Soft delete
    isDeleted: v.optional(v.boolean()),

    // Edit support
    editedAt: v.optional(v.number()),

    // Reactions
    reactions: v.optional(
      v.array(
        v.object({
          emoji: v.string(),
          userId: v.id("users"),
        })
      )
    ),
  })
    .index("by_conversation", ["conversationId"]),


  /* =====================================================
     PRESENCE TABLE (Online / Typing)
  ===================================================== */
  presence: defineTable({
    userId: v.id("users"),

    isOnline: v.boolean(),
    isTyping: v.boolean(),

    // For typing indicator per conversation
    conversationId: v.optional(v.id("conversations")),

    lastSeen: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_conversation", ["conversationId"]),
});