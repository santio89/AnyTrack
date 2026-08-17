import { and, eq } from "drizzle-orm";
import type { BrowserContextOptions } from "playwright";
import { siteSessions } from "@/db/schema";
import { db } from "@/lib/db";

export function getDomainFromUrl(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

export async function getSession(userId: number, domain: string) {
  const [session] = await db
    .select()
    .from(siteSessions)
    .where(and(eq(siteSessions.userId, userId), eq(siteSessions.domain, domain)))
    .limit(1);

  return session ?? null;
}

export async function saveSession(
  userId: number,
  domain: string,
  storageState: object,
) {
  const now = new Date();
  const existing = await getSession(userId, domain);

  if (existing) {
    await db
      .update(siteSessions)
      .set({
        storageState: JSON.stringify(storageState),
        updatedAt: now,
      })
      .where(
        and(eq(siteSessions.userId, userId), eq(siteSessions.domain, domain)),
      );
  } else {
    await db.insert(siteSessions).values({
      userId,
      domain,
      storageState: JSON.stringify(storageState),
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function getStorageStateForUrl(
  url: string,
  userId?: number | null,
): Promise<BrowserContextOptions["storageState"] | undefined> {
  if (userId == null) {
    return undefined;
  }

  const domain = getDomainFromUrl(url);
  const session = await getSession(userId, domain);

  if (!session) {
    return undefined;
  }

  return JSON.parse(session.storageState) as BrowserContextOptions["storageState"];
}
