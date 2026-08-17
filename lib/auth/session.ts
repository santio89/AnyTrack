import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { upsertUser } from "@/lib/auth/users";

export async function getCurrentUserId(): Promise<number | null> {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return null;
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  if (!email) {
    return null;
  }

  const dbUser = await upsertUser({
    email,
    name: user.fullName,
    image: user.imageUrl,
    clerkId: clerkUserId,
  });

  return dbUser.id;
}

export async function requireUserId(): Promise<number> {
  const userId = await getCurrentUserId();

  if (userId == null) {
    throw new Error("Unauthorized");
  }

  return userId;
}

export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}
