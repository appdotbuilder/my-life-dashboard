import { serial, text, pgTable, timestamp, integer, boolean, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  location: text('location'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const calendarEventsTable = pgTable('calendar_events', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'), // Nullable by default
  start_time: timestamp('start_time').notNull(),
  end_time: timestamp('end_time').notNull(),
  location: text('location'), // Nullable by default
  is_all_day: boolean('is_all_day').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const weatherTable = pgTable('weather', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  location: text('location').notNull(),
  temperature: numeric('temperature', { precision: 5, scale: 2 }).notNull(), // Supports decimals like 23.45°C
  condition: text('condition').notNull(),
  humidity: integer('humidity').notNull(), // 0-100%
  wind_speed: numeric('wind_speed', { precision: 5, scale: 2 }).notNull(), // km/h or mph
  recorded_at: timestamp('recorded_at').defaultNow().notNull(),
});

export const musicTracksTable = pgTable('music_tracks', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  album: text('album'), // Nullable by default
  duration_seconds: integer('duration_seconds').notNull(),
  genre: text('genre'), // Nullable by default
  spotify_url: text('spotify_url'), // Nullable by default
  is_favorite: boolean('is_favorite').notNull().default(false),
  added_at: timestamp('added_at').defaultNow().notNull(),
});

// Define relations between tables
export const usersRelations = relations(usersTable, ({ many }) => ({
  calendarEvents: many(calendarEventsTable),
  weatherRecords: many(weatherTable),
  musicTracks: many(musicTracksTable),
}));

export const calendarEventsRelations = relations(calendarEventsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [calendarEventsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const weatherRelations = relations(weatherTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [weatherTable.user_id],
    references: [usersTable.id],
  }),
}));

export const musicTracksRelations = relations(musicTracksTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [musicTracksTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type CalendarEvent = typeof calendarEventsTable.$inferSelect;
export type NewCalendarEvent = typeof calendarEventsTable.$inferInsert;

export type Weather = typeof weatherTable.$inferSelect;
export type NewWeather = typeof weatherTable.$inferInsert;

export type MusicTrack = typeof musicTracksTable.$inferSelect;
export type NewMusicTrack = typeof musicTracksTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  calendarEvents: calendarEventsTable,
  weather: weatherTable,
  musicTracks: musicTracksTable,
};

export const tableRelations = {
  usersRelations,
  calendarEventsRelations,
  weatherRelations,
  musicTracksRelations,
};