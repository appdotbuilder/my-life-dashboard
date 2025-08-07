import { db } from '../db';
import { usersTable, calendarEventsTable, weatherTable, musicTracksTable } from '../db/schema';
import { type User, type CalendarEvent, type Weather, type MusicTrack } from '../schema';
import { eq, gte, desc, and } from 'drizzle-orm';

export interface DashboardData {
    user: User;
    upcomingEvents: CalendarEvent[];
    currentWeather: Weather | null;
    favoriteTracks: MusicTrack[];
}

export async function getDashboardData(userId: number): Promise<DashboardData> {
    try {
        // Fetch user data
        const users = await db.select()
            .from(usersTable)
            .where(eq(usersTable.id, userId))
            .execute();

        if (users.length === 0) {
            throw new Error(`User with id ${userId} not found`);
        }

        const user = users[0];

        // Fetch upcoming events (next 7 days from now)
        const now = new Date();
        const upcomingEventsResults = await db.select()
            .from(calendarEventsTable)
            .where(and(
                eq(calendarEventsTable.user_id, userId),
                gte(calendarEventsTable.start_time, now)
            ))
            .orderBy(calendarEventsTable.start_time)
            .limit(5)
            .execute();

        // Fetch most recent weather data for the user
        const weatherResults = await db.select()
            .from(weatherTable)
            .where(eq(weatherTable.user_id, userId))
            .orderBy(desc(weatherTable.recorded_at))
            .limit(1)
            .execute();

        // Fetch favorite music tracks
        const favoriteTracksResults = await db.select()
            .from(musicTracksTable)
            .where(and(
                eq(musicTracksTable.user_id, userId),
                eq(musicTracksTable.is_favorite, true)
            ))
            .orderBy(desc(musicTracksTable.added_at))
            .limit(10)
            .execute();

        // Convert numeric fields for upcoming events
        const upcomingEvents: CalendarEvent[] = upcomingEventsResults.map((event: any) => ({
            ...event,
            // All fields are already in correct types from the database
        }));

        // Convert numeric fields for weather data
        const currentWeather: Weather | null = weatherResults.length > 0 
            ? {
                ...weatherResults[0],
                temperature: parseFloat(weatherResults[0].temperature),
                wind_speed: parseFloat(weatherResults[0].wind_speed)
            }
            : null;

        // Convert numeric fields for favorite tracks
        const favoriteTracks: MusicTrack[] = favoriteTracksResults.map((track: any) => ({
            ...track,
            // All fields are already in correct types from the database
        }));

        return {
            user,
            upcomingEvents,
            currentWeather,
            favoriteTracks
        };
    } catch (error) {
        console.error('Dashboard data fetch failed:', error);
        throw error;
    }
}