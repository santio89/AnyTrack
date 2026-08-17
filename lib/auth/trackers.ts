import { and, eq, isNull } from "drizzle-orm";
import { trackers } from "@/db/schema";
import { db, initDb } from "@/lib/db";

export async function getTrackerForUser(trackerId: number, userId: number) {
  await initDb();

  const [tracker] = await db
    .select()
    .from(trackers)
    .where(
      and(
        eq(trackers.id, trackerId),
        eq(trackers.userId, userId),
        isNull(trackers.deletedAt),
      ),
    )
    .limit(1);

  return tracker ?? null;
}
