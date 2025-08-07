import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, calendarEventsTable } from '../db/schema';
import { type GetUserEventsInput, type CreateUserInput, type CreateCalendarEventInput } from '../schema';
import { getUserEvents } from '../handlers/get_user_events';

describe('getUserEvents', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create test user
  const createTestUser = async (): Promise<number> => {
    const userData: CreateUserInput = {
      name: 'Test User',
      email: 'test@example.com',
      location: 'Test City'
    };

    const result = await db.insert(usersTable)
      .values(userData)
      .returning()
      .execute();

    return result[0].id;
  };

  // Helper to create test events
  const createTestEvents = async (userId: number) => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const events: CreateCalendarEventInput[] = [
      {
        user_id: userId,
        title: 'Past Event',
        description: 'An event from yesterday',
        start_time: yesterday,
        end_time: new Date(yesterday.getTime() + 60 * 60 * 1000), // 1 hour later
        location: 'Past Location',
        is_all_day: false
      },
      {
        user_id: userId,
        title: 'Current Event',
        description: 'An event happening now',
        start_time: now,
        end_time: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
        location: 'Current Location',
        is_all_day: false
      },
      {
        user_id: userId,
        title: 'Future Event',
        description: 'An event tomorrow',
        start_time: tomorrow,
        end_time: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000), // 3 hours later
        location: null,
        is_all_day: true
      },
      {
        user_id: userId,
        title: 'Next Week Event',
        description: null,
        start_time: nextWeek,
        end_time: new Date(nextWeek.getTime() + 30 * 60 * 1000), // 30 minutes later
        location: 'Future Location',
        is_all_day: false
      }
    ];

    for (const event of events) {
      await db.insert(calendarEventsTable)
        .values(event)
        .execute();
    }
  };

  it('should return all events for a user when no date filters are provided', async () => {
    const userId = await createTestUser();
    await createTestEvents(userId);

    const input: GetUserEventsInput = {
      user_id: userId
    };

    const result = await getUserEvents(input);

    expect(result).toHaveLength(4);
    expect(result[0].title).toEqual('Past Event');
    expect(result[1].title).toEqual('Current Event');
    expect(result[2].title).toEqual('Future Event');
    expect(result[3].title).toEqual('Next Week Event');

    // Verify events are ordered by start_time (ascending)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].start_time >= result[i - 1].start_time).toBe(true);
    }
  });

  it('should filter events by start_date', async () => {
    const userId = await createTestUser();
    await createTestEvents(userId);

    // Use start of today to ensure we include events created "now"
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const input: GetUserEventsInput = {
      user_id: userId,
      start_date: today
    };

    const result = await getUserEvents(input);

    expect(result).toHaveLength(3); // Should exclude past events
    expect(result[0].title).toEqual('Current Event');
    expect(result[1].title).toEqual('Future Event');
    expect(result[2].title).toEqual('Next Week Event');

    // Verify all events start at or after the start_date
    result.forEach(event => {
      expect(event.start_time >= today).toBe(true);
    });
  });

  it('should filter events by end_date', async () => {
    const userId = await createTestUser();
    await createTestEvents(userId);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999); // End of tomorrow

    const input: GetUserEventsInput = {
      user_id: userId,
      end_date: tomorrow
    };

    const result = await getUserEvents(input);

    expect(result).toHaveLength(3); // Should exclude next week event
    expect(result[0].title).toEqual('Past Event');
    expect(result[1].title).toEqual('Current Event');
    expect(result[2].title).toEqual('Future Event');

    // Verify all events start at or before the end_date
    result.forEach(event => {
      expect(event.start_time <= tomorrow).toBe(true);
    });
  });

  it('should filter events by both start_date and end_date', async () => {
    const userId = await createTestUser();
    await createTestEvents(userId);

    // Use start of today to ensure we include events created "now"
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const input: GetUserEventsInput = {
      user_id: userId,
      start_date: today,
      end_date: tomorrow
    };

    const result = await getUserEvents(input);

    expect(result).toHaveLength(2); // Should only include current and future events
    expect(result[0].title).toEqual('Current Event');
    expect(result[1].title).toEqual('Future Event');

    // Verify all events are within the date range
    result.forEach(event => {
      expect(event.start_time >= today).toBe(true);
      expect(event.start_time <= tomorrow).toBe(true);
    });
  });

  it('should return empty array for user with no events', async () => {
    const userId = await createTestUser();

    const input: GetUserEventsInput = {
      user_id: userId
    };

    const result = await getUserEvents(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent user', async () => {
    const input: GetUserEventsInput = {
      user_id: 999999 // Non-existent user ID
    };

    const result = await getUserEvents(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return events with correct structure and types', async () => {
    const userId = await createTestUser();
    await createTestEvents(userId);

    const input: GetUserEventsInput = {
      user_id: userId
    };

    const result = await getUserEvents(input);

    expect(result.length).toBeGreaterThan(0);

    const event = result[0];
    expect(typeof event.id).toBe('number');
    expect(typeof event.user_id).toBe('number');
    expect(typeof event.title).toBe('string');
    expect(typeof event.is_all_day).toBe('boolean');
    expect(event.start_time).toBeInstanceOf(Date);
    expect(event.end_time).toBeInstanceOf(Date);
    expect(event.created_at).toBeInstanceOf(Date);
    expect(event.updated_at).toBeInstanceOf(Date);

    // Optional fields should be string or null
    expect(event.description === null || typeof event.description === 'string').toBe(true);
    expect(event.location === null || typeof event.location === 'string').toBe(true);
  });

  it('should only return events for the specified user', async () => {
    // Create two users
    const user1Id = await createTestUser();
    const user2Data = {
      name: 'Second User',
      email: 'user2@example.com',
      location: 'Another City'
    };
    const user2Result = await db.insert(usersTable)
      .values(user2Data)
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create events for both users
    await createTestEvents(user1Id);
    await createTestEvents(user2Id);

    // Query events for user1 only
    const input: GetUserEventsInput = {
      user_id: user1Id
    };

    const result = await getUserEvents(input);

    expect(result).toHaveLength(4);
    // Verify all events belong to user1
    result.forEach(event => {
      expect(event.user_id).toEqual(user1Id);
    });
  });

  it('should handle date edge cases correctly', async () => {
    const userId = await createTestUser();

    // Create an event at exactly midnight
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    await db.insert(calendarEventsTable)
      .values({
        user_id: userId,
        title: 'Midnight Event',
        description: 'Event at midnight',
        start_time: midnight,
        end_time: new Date(midnight.getTime() + 60 * 60 * 1000),
        location: null,
        is_all_day: false
      })
      .execute();

    // Query with the same date as start_date
    const input: GetUserEventsInput = {
      user_id: userId,
      start_date: midnight
    };

    const result = await getUserEvents(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Midnight Event');
    expect(result[0].start_time.getTime()).toEqual(midnight.getTime());
  });
});