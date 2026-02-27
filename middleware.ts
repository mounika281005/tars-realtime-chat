import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/chat(.*)",
]);

const hasClerkEnv =
  Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ) &&
  Boolean(process.env.CLERK_SECRET_KEY);

const authMiddleware = clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
  }
);

export default function middleware(
  req: NextRequest,
  event: NextFetchEvent
) {
  if (!hasClerkEnv) {
    return NextResponse.next();
  }
  return authMiddleware(req, event);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
