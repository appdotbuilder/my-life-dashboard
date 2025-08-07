import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  location: z.string().nullable(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Calendar event schema
export const calendarEventSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  location: z.string().nullable(),
  is_all_day: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;

// Weather information schema
export const weatherSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  location: z.string(),
  temperature: z.number(),
  condition: z.string(),
  humidity: z.number().int(),
  wind_speed: z.number(),
  recorded_at: z.coerce.date()
});

export type Weather = z.infer<typeof weatherSchema>;

// Music track schema
export const musicTrackSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string(),
  artist: z.string(),
  album: z.string().nullable(),
  duration_seconds: z.number().int(),
  genre: z.string().nullable(),
  spotify_url: z.string().nullable(),
  is_favorite: z.boolean(),
  added_at: z.coerce.date()
});

export type MusicTrack = z.infer<typeof musicTrackSchema>;

// Input schemas for creating entities
export const createUserInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  location: z.string().nullable().optional()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createCalendarEventInputSchema = z.object({
  user_id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  location: z.string().nullable().optional(),
  is_all_day: z.boolean().default(false)
});

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventInputSchema>;

export const createWeatherInputSchema = z.object({
  user_id: z.number(),
  location: z.string().min(1),
  temperature: z.number(),
  condition: z.string().min(1),
  humidity: z.number().int().min(0).max(100),
  wind_speed: z.number().nonnegative()
});

export type CreateWeatherInput = z.infer<typeof createWeatherInputSchema>;

export const createMusicTrackInputSchema = z.object({
  user_id: z.number(),
  title: z.string().min(1),
  artist: z.string().min(1),
  album: z.string().nullable().optional(),
  duration_seconds: z.number().int().positive(),
  genre: z.string().nullable().optional(),
  spotify_url: z.string().url().nullable().optional(),
  is_favorite: z.boolean().default(false)
});

export type CreateMusicTrackInput = z.infer<typeof createMusicTrackInputSchema>;

// Update schemas
export const updateUserInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  location: z.string().nullable().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const updateCalendarEventInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  start_time: z.coerce.date().optional(),
  end_time: z.coerce.date().optional(),
  location: z.string().nullable().optional(),
  is_all_day: z.boolean().optional()
});

export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventInputSchema>;

export const updateMusicTrackInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  artist: z.string().min(1).optional(),
  album: z.string().nullable().optional(),
  duration_seconds: z.number().int().positive().optional(),
  genre: z.string().nullable().optional(),
  spotify_url: z.string().url().nullable().optional(),
  is_favorite: z.boolean().optional()
});

export type UpdateMusicTrackInput = z.infer<typeof updateMusicTrackInputSchema>;

// Query schemas
export const getUserEventsInputSchema = z.object({
  user_id: z.number(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional()
});

export type GetUserEventsInput = z.infer<typeof getUserEventsInputSchema>;

export const getUserMusicTracksInputSchema = z.object({
  user_id: z.number(),
  favorites_only: z.boolean().optional()
});

export type GetUserMusicTracksInput = z.infer<typeof getUserMusicTracksInputSchema>;

export const getCurrentWeatherInputSchema = z.object({
  user_id: z.number()
});

export type GetCurrentWeatherInput = z.infer<typeof getCurrentWeatherInputSchema>;