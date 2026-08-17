import { eq } from "drizzle-orm";
import type { BrowserContextOptions } from "playwright";
import { siteSessions } from "@/db/schema";
import { db } from "@/lib/db";

export function getDomainFromUrl(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

export async function getSession(domain: string) {
  const [session] = await db
    .select()
    .from(siteSessions)
    .where(eq(siteSessions.domain, domain))
    .limit(1);

  return session ?? null;
}

export async function saveSession(domain: string, storageState: object) {
  const now = new Date();
  const existing = await getSession(domain);

  if (existing) {
    await db
      .update(siteSessions)
      .set({
        storageState: JSON.stringify(storageState),
        updatedAt: now,
      })
      .where(eq(siteSessions.domain, domain));
  } else {
    await db.insert(siteSessions).values({
      domain,
      storageState: JSON.stringify(storageState),
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function deleteSession(domain: string) {
  await db.delete(siteSessions).where(eq(siteSessions.domain, domain));
}

export async function getStorageStateForUrl(
  url: string,
): Promise<BrowserContextOptions["storageState"] | undefined> {
  const domain = getDomainFromUrl(url);
  const session = await getSession(domain);

  if (!session) {
    return undefined;
  }

  return JSON.parse(session.storageState) as BrowserContextOptions["storageState"];
}
