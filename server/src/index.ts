import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import { 
  createUserInputSchema,
  updateUserInputSchema,
  createCalendarEventInputSchema,
  updateCalendarEventInputSchema,
  createWeatherInputSchema,
  createMusicTrackInputSchema,
  updateMusicTrackInputSchema,
  getUserEventsInputSchema,
  getUserMusicTracksInputSchema,
  getCurrentWeatherInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUser } from './handlers/get_user';
import { updateUser } from './handlers/update_user';
import { createCalendarEvent } from './handlers/create_calendar_event';
import { getUserEvents } from './handlers/get_user_events';
import { updateCalendarEvent } from './handlers/update_calendar_event';
import { deleteCalendarEvent } from './handlers/delete_calendar_event';
import { createWeatherRecord } from './handlers/create_weather_record';
import { getCurrentWeather } from './handlers/get_current_weather';
import { createMusicTrack } from './handlers/create_music_track';
import { getUserMusicTracks } from './handlers/get_user_music_tracks';
import { updateMusicTrack } from './handlers/update_music_track';
import { deleteMusicTrack } from './handlers/delete_music_track';
import { getDashboardData } from './handlers/get_dashboard_data';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUser(input.userId)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Calendar events
  createCalendarEvent: publicProcedure
    .input(createCalendarEventInputSchema)
    .mutation(({ input }) => createCalendarEvent(input)),

  getUserEvents: publicProcedure
    .input(getUserEventsInputSchema)
    .query(({ input }) => getUserEvents(input)),

  updateCalendarEvent: publicProcedure
    .input(updateCalendarEventInputSchema)
    .mutation(({ input }) => updateCalendarEvent(input)),

  deleteCalendarEvent: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .mutation(({ input }) => deleteCalendarEvent(input.eventId)),

  // Weather
  createWeatherRecord: publicProcedure
    .input(createWeatherInputSchema)
    .mutation(({ input }) => createWeatherRecord(input)),

  getCurrentWeather: publicProcedure
    .input(getCurrentWeatherInputSchema)
    .query(({ input }) => getCurrentWeather(input)),

  // Music tracks
  createMusicTrack: publicProcedure
    .input(createMusicTrackInputSchema)
    .mutation(({ input }) => createMusicTrack(input)),

  getUserMusicTracks: publicProcedure
    .input(getUserMusicTracksInputSchema)
    .query(({ input }) => getUserMusicTracks(input)),

  updateMusicTrack: publicProcedure
    .input(updateMusicTrackInputSchema)
    .mutation(({ input }) => updateMusicTrack(input)),

  deleteMusicTrack: publicProcedure
    .input(z.object({ trackId: z.number() }))
    .mutation(({ input }) => deleteMusicTrack(input.trackId)),

  // Dashboard aggregation
  getDashboardData: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getDashboardData(input.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Personal Dashboard TRPC server listening at port: ${port}`);
}

start();