import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { db, initDb } from "@/lib/db";

type UpsertUserInput = {
  email: string;
  name?: string | null;
  image?: string | null;
  googleId?: string | null;
  clerkId?: string | null;
};

export async function upsertUser(input: UpsertUserInput) {
  await initDb();

  const now = new Date();

  if (input.clerkId) {
    const [byClerk] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, input.clerkId))
      .limit(1);

    if (byClerk) {
      const [updated] = await db
        .update(users)
        .set({
          email: input.email,
          name: input.name ?? byClerk.name,
          image: input.image ?? byClerk.image,
          updatedAt: now,
        })
        .where(eq(users.id, byClerk.id))
        .returning();

      return updated;
    }
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        name: input.name ?? existing.name,
        image: input.image ?? existing.image,
        googleId: input.googleId ?? existing.googleId,
        clerkId: input.clerkId ?? existing.clerkId,
        updatedAt: now,
      })
      .where(eq(users.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({
      email: input.email,
      name: input.name ?? null,
      image: input.image ?? null,
      googleId: input.googleId ?? null,
      clerkId: input.clerkId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created;
}

export async function getUserById(userId: number) {
  await initDb();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}
