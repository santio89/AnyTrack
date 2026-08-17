import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  googleId: text("google_id").unique(),
  clerkId: text("clerk_id").unique(),
  aiProvider: text("ai_provider"),
  aiApiKeyEncrypted: text("ai_api_key_encrypted"),
  aiFallbackEnabled: boolean("ai_fallback_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const trackers = pgTable("trackers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  targetDescription: text("target_description").notNull(),
  referenceImagePath: text("reference_image_path"),
  referenceImagePaths: text("reference_image_paths"),
  frequencyMinutes: integer("frequency_minutes").notNull().default(60),
  sortOrder: integer("sort_order").notNull().default(0),
  notifyOnChange: boolean("notify_on_change").notNull().default(false),
  notifyOnFailure: boolean("notify_on_failure").notNull().default(false),
  notificationEmail: text("notification_email"),
  isActive: boolean("is_active").notNull().default(true),
  lastRunAt: timestamp("last_run_at", { mode: "date" }),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  trackerId: integer("tracker_id")
    .notNull()
    .references(() => trackers.id, { onDelete: "cascade" }),
  extractedValue: text("extracted_value"),
  confidence: doublePrecision("confidence"),
  model: text("model"),
  error: text("error"),
  screenshotPath: text("screenshot_path"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const siteSessions = pgTable(
  "site_sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    storageState: text("storage_state").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    userDomainIdx: uniqueIndex("site_sessions_user_domain_idx").on(
      table.userId,
      table.domain,
    ),
  }),
);

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
