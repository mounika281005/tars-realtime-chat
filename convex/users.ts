import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/* =========================================================
   CREATE OR UPDATE USER
========================================================= */
export const createOrUpdateUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {

    // Check if the user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      // Update the existing user
      await ctx.db.patch(existingUser._id, {
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
      });
      return existingUser._id;
    }

    // Create a new user
    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      imageUrl: args.imageUrl,
    });
  },
});


/* =========================================================
   GET USER PROFILE BY CLERK ID
========================================================= */
export const getUserByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});


/* =========================================================
   GET ALL USERS (EXCLUDING CURRENT USER)
========================================================= */
export const getAllUsers = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Fetch the current user using the clerkId
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!currentUser) return [];

    // Fetch all users and filter out the current user
    const allUsers = await ctx.db.query("users").collect();
    const presenceRows = await ctx.db
      .query("presence")
      .collect();

    const presenceByUser = new Map(
      presenceRows.map((p) => [p.userId, p])
    );

    return allUsers
      .filter((user) => user._id !== currentUser._id)
      .map((user) => {
        const presence = presenceByUser.get(
          user._id
        );
        return {
          ...user,
          isOnline: presence?.isOnline ?? false,
          lastSeen: presence?.lastSeen ?? 0,
        };
      });
  },
});
