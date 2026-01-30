import { relations } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { classEnum, timeSlots } from "../constants";

export type ClassType = (typeof classEnum)[number];

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  discordId: text("discord_id").unique(),
  username: text("username").notNull().unique(),
  password: text("password"),
  isAdmin: integer("is_admin", { mode: "boolean" }).default(false),
  primaryClass: text("primary_class", { mode: "json" })
    .notNull()
    .$type<[ClassType, ClassType]>(),
  secondaryClass: text("secondary_class", { mode: "json" }).$type<
    [ClassType, ClassType]
  >(),
  primaryRole: text("primary_role", {
    enum: ["dps", "healer", "tank"],
  }).notNull(),
  secondaryRole: text("secondary_role", { enum: ["dps", "healer", "tank"] }),
  region: text("region", { enum: ["vn", "na"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Events table - weekly events separated by region
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  region: text("region", { enum: ["vn", "na"] }).notNull(),
  weekStartDate: integer("week_start_date", { mode: "timestamp" }).notNull(), // Monday of the week
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

// Teams table - for organizing users into teams
export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  day: text("day", { enum: ["saturday", "sunday"] })
    .notNull()
    .default("saturday"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

// Team members join table - assigns users to teams
export const teamMembers = sqliteTable(
  "team_members",
  {
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedAt: integer("assigned_at", { mode: "timestamp" }).$defaultFn(
      () => new Date(),
    ),
  },
  (table) => [primaryKey({ columns: [table.teamId, table.userId] })],
);

export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;

export type TimeSlot = (typeof timeSlots)[number];

// Event signups - tracks user participation per event
export const eventSignups = sqliteTable(
  "event_signups",
  {
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    timeSlots: text("time_slots", { mode: "json" })
      .notNull()
      .$type<TimeSlot[]>(),
    notes: text("notes"),
    signedUpAt: integer("signed_up_at", { mode: "timestamp" }).$defaultFn(
      () => new Date(),
    ),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.userId] })],
);

export type EventSignup = typeof eventSignups.$inferSelect;
export type NewEventSignup = typeof eventSignups.$inferInsert;

// schedule notifications
export const scheduledNotifications = sqliteTable("scheduled_notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  days: text("days", { mode: "json" }).$type<string[]>(),
  region: text("region", { enum: ["vn", "na"] }).notNull(),
  startTime: text("start_time").notNull(), // "HH:MM" format
  endTime: text("end_time").notNull(), // "HH:MM" format
  notifyBeforeMinutes: integer("notify_before_minutes").notNull(),
  mentionRole: text("mention_role"),
  channelId: text("channel_id").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export type ScheduledNotification = typeof scheduledNotifications.$inferSelect;
export type NewScheduledNotification =
  typeof scheduledNotifications.$inferInsert;
export type UpdateScheduledNotification = Partial<
  Omit<ScheduledNotification, "id" | "createdAt" | "region">
>;

// Relations
export const eventsRelations = relations(events, ({ many }) => ({
  teams: many(teams),
  signups: many(eventSignups),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  event: one(events, {
    fields: [teams.eventId],
    references: [events.id],
  }),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  teamMemberships: many(teamMembers),
  eventSignups: many(eventSignups),
}));

export const eventSignupsRelations = relations(eventSignups, ({ one }) => ({
  event: one(events, {
    fields: [eventSignups.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventSignups.userId],
    references: [users.id],
  }),
}));
