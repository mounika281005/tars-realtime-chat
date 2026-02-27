"use client";

import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const { user } = useUser();
  const createOrUpdateUser = useMutation(
    api.users.createOrUpdateUser
  );

  useEffect(() => {
    if (!user?.id) return;

    createOrUpdateUser({
      clerkId: user.id,
      name:
        user.fullName ||
        user.username ||
        "User",
      email:
        user.primaryEmailAddress
          ?.emailAddress || "",
      imageUrl: user.imageUrl || "",
    });
  }, [user, createOrUpdateUser]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 relative overflow-hidden">

      {/* Background Glow Effects */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[150px]" />

      <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-2xl shadow-2xl text-center space-y-6 max-w-md w-full">

        <h1 className="text-4xl font-bold text-white">
          Tars Realtime Chat
        </h1>

        <p className="text-zinc-400 text-sm">
          Full-stack real-time messaging built with
          <br />
          Next.js • Convex • Clerk
        </p>

        {/* Logged Out */}
        <SignedOut>
          <div className="flex items-center justify-center gap-3">
            <SignInButton mode="modal">
              <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 transition rounded-xl text-white font-medium shadow-lg shadow-indigo-500/20 hover:scale-105">
                Log In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 transition rounded-xl text-white font-medium">
                Sign Up
              </button>
            </SignUpButton>
          </div>
        </SignedOut>

        {/* Logged In */}
        <SignedIn>
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <UserButton afterSignOutUrl="/" />
              <p className="text-sm text-zinc-300">
                {user?.fullName || user?.username}
              </p>
            </div>
            <Link
              href="/chat"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 transition rounded-xl text-white font-medium shadow-lg shadow-indigo-500/20 hover:scale-105"
            >
              Go to Chat
            </Link>
          </div>
        </SignedIn>

      </div>
    </main>
  );
}
