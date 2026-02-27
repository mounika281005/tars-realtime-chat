import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/* =========================================================
   UPDATE PRESENCE (Online / Typing)
========================================================= */

export const updatePresence = mutation({
  args: {
    userId: v.id("users"),
    isOnline: v.boolean(),
    isTyping: v.boolean(),
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) =>
        q.eq("userId", args.userId)
      )
      .unique();

    const data = {
      userId: args.userId,
      isOnline: args.isOnline,
      isTyping: args.isTyping,
      conversationId: args.conversationId,
      lastSeen: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("presence", data);
    }
  },
});


/* =========================================================
   GET SINGLE USER PRESENCE (Online Badge / Last Seen)
========================================================= */

export const getPresence = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {

    return await ctx.db
      .query("presence")
      .withIndex("by_user", (q) =>
        q.eq("userId", args.userId)
      )
      .unique();
  },
});


/* =========================================================
   GET TYPING USERS FOR A CONVERSATION
   (Used for group typing names)
========================================================= */

export const getTypingUsers = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {

    return await ctx.db
      .query("presence")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect()
      .then((results) =>
        results.filter(
          (p) => p.isTyping && p.isOnline
        )
      );
  },
});