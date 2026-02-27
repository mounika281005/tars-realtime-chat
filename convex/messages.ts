import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/* =========================================================
   SEND MESSAGE
========================================================= */

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const newMessage = {
      conversationId: args.conversationId,
      senderId: args.senderId,
      body: args.body,
      createdAt: Date.now(),
      readBy: [args.senderId], // Mark as read by the sender initially
    };

    const message = await ctx.db.insert("messages", newMessage);

    // Update the conversation's last message and timestamp
    await ctx.db.patch(args.conversationId, {
      lastMessage: args.body,
      lastMessageAt: Date.now(),
      lastMessageSenderId: args.senderId,
    });

    return message;
  },
});


/* =========================================================
   FETCH MESSAGES BY CONVERSATION
========================================================= */

export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    return messages;
  },
});


/* =========================================================
   DELETE MESSAGE (SOFT DELETE)
========================================================= */

export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);

    if (!message || message.senderId !== args.userId) {
      throw new Error("You cannot delete this message.");
    }

    // Mark the message as deleted (soft delete)
    await ctx.db.patch(args.messageId, {
      isDeleted: true,
    });
  },
});


/* =========================================================
   TOGGLE REACTION (Like/Remove Reaction)
========================================================= */

export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found.");
    }

    const existingReactions = message.reactions || [];
    const reactionIndex = existingReactions.findIndex(
      (r) => r.userId === args.userId && r.emoji === args.emoji
    );

    if (reactionIndex >= 0) {
      // Remove reaction if it already exists
      existingReactions.splice(reactionIndex, 1);
    } else {
      // Add new reaction
      existingReactions.push({ userId: args.userId, emoji: args.emoji });
    }

    // Update the message reactions
    await ctx.db.patch(args.messageId, {
      reactions: existingReactions,
    });
  },
});


/* =========================================================
   MARK MESSAGE AS READ
========================================================= */

export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all messages for this conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // Mark messages as read by the user
    for (const message of messages) {
      if (!message.readBy.includes(args.userId)) {
        await ctx.db.patch(message._id, {
          readBy: [...message.readBy, args.userId],
        });
      }
    }
  },
});

/* =========================================================
   EDIT MESSAGE
========================================================= */

export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    newBody: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found.");
    }

    if (message.senderId !== args.userId) {
      throw new Error("You cannot edit this message.");
    }

    // Update message body
    await ctx.db.patch(args.messageId, {
      body: args.newBody,
      editedAt: Date.now(), // Optional: Add an 'editedAt' field if desired
    });
  },
});