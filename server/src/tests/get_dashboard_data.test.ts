import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, calendarEventsTable, weatherTable, musicTracksTable } from '../db/schema';
import { getDashboardData } from '../handlers/get_dashboard_data';

describe('getDashboardData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch complete dashboard data for a user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        location: 'Test City'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create upcoming calendar events
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    await db.insert(calendarEventsTable)
      .values([
        {
          user_id: userId,
          title: 'Morning Meeting',
          description: 'Team standup',
          start_time: tomorrow,
          end_time: new Date(tomorrow.getTime() + 3600000), // 1 hour later
          location: 'Office',
          is_all_day: false
        },
        {
          user_id: userId,
          title: 'All Day Event',
          description: 'Conference',
          start_time: nextWeek,
          end_time: nextWeek,
          location: 'Convention Center',
          is_all_day: true
        }
      ])
      .execute();

    // Create weather data
    await db.insert(weatherTable)
      .values({
        user_id: userId,
        location: 'Test City',
        temperature: '22.5',
        condition: 'Sunny',
        humidity: 65,
        wind_speed: '10.2'
      })
      .execute();

    // Create favorite music tracks with explicit timestamps
    const baseTime = new Date();
    const firstTrackTime = new Date(baseTime.getTime() - 60000); // 1 minute ago
    const thirdTrackTime = new Date(baseTime.getTime() + 60000); // 1 minute from now

    await db.insert(musicTracksTable)
      .values([
        {
          user_id: userId,
          title: 'Favorite Song 1',
          artist: 'Artist 1',
          album: 'Album 1',
          duration_seconds: 210,
          genre: 'Pop',
          spotify_url: 'https://spotify.com/track1',
          is_favorite: true,
          added_at: firstTrackTime
        },
        {
          user_id: userId,
          title: 'Regular Song',
          artist: 'Artist 2',
          album: 'Album 2',
          duration_seconds: 180,
          genre: 'Rock',
          spotify_url: 'https://spotify.com/track2',
          is_favorite: false,
          added_at: baseTime
        },
        {
          user_id: userId,
          title: 'Favorite Song 2',
          artist: 'Artist 3',
          album: null,
          duration_seconds: 195,
          genre: null,
          spotify_url: null,
          is_favorite: true,
          added_at: thirdTrackTime
        }
      ])
      .execute();

    const result = await getDashboardData(userId);

    // Verify user data
    expect(result.user.id).toEqual(userId);
    expect(result.user.name).toEqual('Test User');
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.location).toEqual('Test City');
    expect(result.user.created_at).toBeInstanceOf(Date);

    // Verify upcoming events (should be ordered by start_time)
    expect(result.upcomingEvents).toHaveLength(2);
    expect(result.upcomingEvents[0].title).toEqual('Morning Meeting');
    expect(result.upcomingEvents[0].start_time).toBeInstanceOf(Date);
    expect(result.upcomingEvents[0].is_all_day).toBe(false);
    expect(result.upcomingEvents[1].title).toEqual('All Day Event');
    expect(result.upcomingEvents[1].is_all_day).toBe(true);

    // Verify current weather with numeric conversions
    expect(result.currentWeather).not.toBeNull();
    expect(result.currentWeather!.location).toEqual('Test City');
    expect(result.currentWeather!.temperature).toEqual(22.5);
    expect(typeof result.currentWeather!.temperature).toBe('number');
    expect(result.currentWeather!.condition).toEqual('Sunny');
    expect(result.currentWeather!.humidity).toEqual(65);
    expect(result.currentWeather!.wind_speed).toEqual(10.2);
    expect(typeof result.currentWeather!.wind_speed).toBe('number');
    expect(result.currentWeather!.recorded_at).toBeInstanceOf(Date);

    // Verify favorite tracks (should only include favorites, ordered by added_at desc)
    expect(result.favoriteTracks).toHaveLength(2);
    expect(result.favoriteTracks.every(track => track.is_favorite)).toBe(true);
    expect(result.favoriteTracks[0].title).toEqual('Favorite Song 2'); // Most recent
    expect(result.favoriteTracks[1].title).toEqual('Favorite Song 1'); // Earlier
    expect(result.favoriteTracks[0].added_at).toBeInstanceOf(Date);
  });

  it('should return empty arrays when user has no related data', async () => {
    // Create test user with no related data
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Empty User',
        email: 'empty@example.com',
        location: null
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const result = await getDashboardData(userId);

    // Verify user data
    expect(result.user.id).toEqual(userId);
    expect(result.user.name).toEqual('Empty User');
    expect(result.user.location).toBeNull();

    // Verify empty collections
    expect(result.upcomingEvents).toHaveLength(0);
    expect(result.currentWeather).toBeNull();
    expect(result.favoriteTracks).toHaveLength(0);
  });

  it('should only return upcoming events, not past ones', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create past and future events
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await db.insert(calendarEventsTable)
      .values([
        {
          user_id: userId,
          title: 'Past Event',
          description: 'Should not appear',
          start_time: yesterday,
          end_time: yesterday,
          is_all_day: false
        },
        {
          user_id: userId,
          title: 'Future Event',
          description: 'Should appear',
          start_time: tomorrow,
          end_time: tomorrow,
          is_all_day: false
        }
      ])
      .execute();

    const result = await getDashboardData(userId);

    expect(result.upcomingEvents).toHaveLength(1);
    expect(result.upcomingEvents[0].title).toEqual('Future Event');
    expect(result.upcomingEvents[0].start_time >= now).toBe(true);
  });

  it('should return most recent weather data', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple weather records with different timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const twoHoursAgo = new Date(now.getTime() - 7200000);

    await db.insert(weatherTable)
      .values([
        {
          user_id: userId,
          location: 'Test City',
          temperature: '20.0',
          condition: 'Cloudy',
          humidity: 70,
          wind_speed: '8.0',
          recorded_at: twoHoursAgo
        },
        {
          user_id: userId,
          location: 'Test City',
          temperature: '22.5',
          condition: 'Sunny',
          humidity: 65,
          wind_speed: '10.2',
          recorded_at: now
        },
        {
          user_id: userId,
          location: 'Test City',
          temperature: '21.0',
          condition: 'Partly Cloudy',
          humidity: 68,
          wind_speed: '9.0',
          recorded_at: oneHourAgo
        }
      ])
      .execute();

    const result = await getDashboardData(userId);

    // Should return the most recent weather record
    expect(result.currentWeather).not.toBeNull();
    expect(result.currentWeather!.condition).toEqual('Sunny');
    expect(result.currentWeather!.temperature).toEqual(22.5);
    expect(result.currentWeather!.recorded_at).toEqual(now);
  });

  it('should limit results appropriately', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create many events and tracks to test limits
    const now = new Date();
    const events = [];
    const tracks = [];

    // Create 10 upcoming events
    for (let i = 1; i <= 10; i++) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + i);
      
      events.push({
        user_id: userId,
        title: `Event ${i}`,
        description: `Description ${i}`,
        start_time: eventDate,
        end_time: eventDate,
        is_all_day: false
      });
    }

    // Create 15 favorite tracks
    for (let i = 1; i <= 15; i++) {
      tracks.push({
        user_id: userId,
        title: `Track ${i}`,
        artist: `Artist ${i}`,
        duration_seconds: 200,
        is_favorite: true
      });
    }

    await db.insert(calendarEventsTable).values(events).execute();
    await db.insert(musicTracksTable).values(tracks).execute();

    const result = await getDashboardData(userId);

    // Should limit upcoming events to 5
    expect(result.upcomingEvents).toHaveLength(5);
    expect(result.upcomingEvents[0].title).toEqual('Event 1'); // First upcoming

    // Should limit favorite tracks to 10
    expect(result.favoriteTracks).toHaveLength(10);
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 999;

    await expect(getDashboardData(nonExistentUserId))
      .rejects.toThrow(/User with id 999 not found/i);
  });

  it('should handle user data from different users separately', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        name: 'User 1',
        email: 'user1@example.com'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        name: 'User 2',
        email: 'user2@example.com'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create data for both users with specific timestamps to avoid conflicts
    const baseFutureTime = new Date();
    baseFutureTime.setDate(baseFutureTime.getDate() + 5); // 5 days from now, different from other tests
    
    const user1EventTime = new Date(baseFutureTime);
    const user2EventTime = new Date(baseFutureTime.getTime() + 3600000); // 1 hour later

    await db.insert(calendarEventsTable)
      .values([
        {
          user_id: user1Id,
          title: 'User 1 Event',
          start_time: user1EventTime,
          end_time: user1EventTime,
          is_all_day: false
        },
        {
          user_id: user2Id,
          title: 'User 2 Event',
          start_time: user2EventTime,
          end_time: user2EventTime,
          is_all_day: false
        }
      ])
      .execute();

    const trackTime1 = new Date();
    const trackTime2 = new Date(trackTime1.getTime() + 1000); // 1 second later

    await db.insert(musicTracksTable)
      .values([
        {
          user_id: user1Id,
          title: 'User 1 Track',
          artist: 'Artist 1',
          duration_seconds: 200,
          is_favorite: true,
          added_at: trackTime1
        },
        {
          user_id: user2Id,
          title: 'User 2 Track',
          artist: 'Artist 2',
          duration_seconds: 180,
          is_favorite: true,
          added_at: trackTime2
        }
      ])
      .execute();

    // Fetch dashboard data for user 1
    const result1 = await getDashboardData(user1Id);

    expect(result1.user.name).toEqual('User 1');
    expect(result1.upcomingEvents).toHaveLength(1);
    expect(result1.upcomingEvents[0].title).toEqual('User 1 Event');
    expect(result1.favoriteTracks).toHaveLength(1);
    expect(result1.favoriteTracks[0].title).toEqual('User 1 Track');

    // Fetch dashboard data for user 2
    const result2 = await getDashboardData(user2Id);

    expect(result2.user.name).toEqual('User 2');
    expect(result2.upcomingEvents).toHaveLength(1);
    expect(result2.upcomingEvents[0].title).toEqual('User 2 Event');
    expect(result2.favoriteTracks).toHaveLength(1);
    expect(result2.favoriteTracks[0].title).toEqual('User 2 Track');
  });
});