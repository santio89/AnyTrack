import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  googleId: text("google_id").unique(),
  clerkId: text("clerk_id").unique(),
  aiProvider: text("ai_provider"),
  aiApiKeyEncrypted: text("ai_api_key_encrypted"),
  aiFallbackEnabled: integer("ai_fallback_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const trackers = sqliteTable("trackers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  targetDescription: text("target_description").notNull(),
  referenceImagePath: text("reference_image_path"),
  referenceImagePaths: text("reference_image_paths"),
  frequencyMinutes: integer("frequency_minutes").notNull().default(60),
  sortOrder: integer("sort_order").notNull().default(0),
  notifyOnChange: integer("notify_on_change", { mode: "boolean" })
    .notNull()
    .default(false),
  notificationEmail: text("notification_email"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastRunAt: integer("last_run_at", { mode: "timestamp" }),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const logs = sqliteTable("logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trackerId: integer("tracker_id")
    .notNull()
    .references(() => trackers.id, { onDelete: "cascade" }),
  extractedValue: text("extracted_value"),
  confidence: real("confidence"),
  model: text("model"),
  error: text("error"),
  screenshotPath: text("screenshot_path"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const siteSessions = sqliteTable("site_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  domain: text("domain").notNull().unique(),
  storageState: text("storage_state").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
  trackers: many(trackers),
}));

export const trackersRelations = relations(trackers, ({ one, many }) => ({
  user: one(users, {
    fields: [trackers.userId],
    references: [users.id],
  }),
  logs: many(logs),
}));

export const logsRelations = relations(logs, ({ one }) => ({
  tracker: one(trackers, {
    fields: [logs.trackerId],
    references: [trackers.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Tracker = typeof trackers.$inferSelect;
export type NewTracker = typeof trackers.$inferInsert;
export type Log = typeof logs.$inferSelect;
export type NewLog = typeof logs.$inferInsert;
export type SiteSession = typeof siteSessions.$inferSelect;
