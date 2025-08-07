import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { calendarEventsTable, usersTable } from '../db/schema';
import { type CreateCalendarEventInput } from '../schema';
import { createCalendarEvent } from '../handlers/create_calendar_event';
import { eq } from 'drizzle-orm';

describe('createCalendarEvent', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test user first since calendar events have a foreign key constraint
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        location: 'Test Location'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should create a calendar event with all fields', async () => {
    const testInput: CreateCalendarEventInput = {
      user_id: testUserId,
      title: 'Team Meeting',
      description: 'Weekly team sync meeting',
      start_time: new Date('2024-01-15T09:00:00Z'),
      end_time: new Date('2024-01-15T10:00:00Z'),
      location: 'Conference Room A',
      is_all_day: false
    };

    const result = await createCalendarEvent(testInput);

    // Basic field validation
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.title).toEqual('Team Meeting');
    expect(result.description).toEqual('Weekly team sync meeting');
    expect(result.start_time).toEqual(new Date('2024-01-15T09:00:00Z'));
    expect(result.end_time).toEqual(new Date('2024-01-15T10:00:00Z'));
    expect(result.location).toEqual('Conference Room A');
    expect(result.is_all_day).toEqual(false);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a calendar event with minimal fields', async () => {
    const testInput: CreateCalendarEventInput = {
      user_id: testUserId,
      title: 'Simple Event',
      start_time: new Date('2024-01-15T09:00:00Z'),
      end_time: new Date('2024-01-15T10:00:00Z'),
      is_all_day: false
    };

    const result = await createCalendarEvent(testInput);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.title).toEqual('Simple Event');
    expect(result.description).toBeNull();
    expect(result.location).toBeNull();
    expect(result.is_all_day).toEqual(false);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an all-day event', async () => {
    const testInput: CreateCalendarEventInput = {
      user_id: testUserId,
      title: 'Holiday',
      start_time: new Date('2024-01-15T00:00:00Z'),
      end_time: new Date('2024-01-15T23:59:59Z'),
      is_all_day: true
    };

    const result = await createCalendarEvent(testInput);

    expect(result.title).toEqual('Holiday');
    expect(result.is_all_day).toEqual(true);
    expect(result.start_time).toEqual(new Date('2024-01-15T00:00:00Z'));
    expect(result.end_time).toEqual(new Date('2024-01-15T23:59:59Z'));
  });

  it('should save calendar event to database', async () => {
    const testInput: CreateCalendarEventInput = {
      user_id: testUserId,
      title: 'Database Test Event',
      description: 'Testing database persistence',
      start_time: new Date('2024-01-15T14:00:00Z'),
      end_time: new Date('2024-01-15T15:00:00Z'),
      location: 'Test Location',
      is_all_day: false
    };

    const result = await createCalendarEvent(testInput);

    // Query the database to verify the event was saved
    const events = await db.select()
      .from(calendarEventsTable)
      .where(eq(calendarEventsTable.id, result.id))
      .execute();

    expect(events).toHaveLength(1);
    expect(events[0].title).toEqual('Database Test Event');
    expect(events[0].description).toEqual('Testing database persistence');
    expect(events[0].location).toEqual('Test Location');
    expect(events[0].user_id).toEqual(testUserId);
    expect(events[0].is_all_day).toEqual(false);
    expect(events[0].created_at).toBeInstanceOf(Date);
    expect(events[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle date objects correctly', async () => {
    const startDate = new Date('2024-02-01T10:30:00.000Z');
    const endDate = new Date('2024-02-01T12:00:00.000Z');

    const testInput: CreateCalendarEventInput = {
      user_id: testUserId,
      title: 'Date Test Event',
      start_time: startDate,
      end_time: endDate,
      is_all_day: false
    };

    const result = await createCalendarEvent(testInput);

    expect(result.start_time).toEqual(startDate);
    expect(result.end_time).toEqual(endDate);

    // Verify dates are preserved in database
    const events = await db.select()
      .from(calendarEventsTable)
      .where(eq(calendarEventsTable.id, result.id))
      .execute();

    expect(events[0].start_time).toEqual(startDate);
    expect(events[0].end_time).toEqual(endDate);
  });

  it('should throw error for non-existent user_id', async () => {
    const testInput: CreateCalendarEventInput = {
      user_id: 99999, // Non-existent user ID
      title: 'Invalid User Event',
      start_time: new Date('2024-01-15T09:00:00Z'),
      end_time: new Date('2024-01-15T10:00:00Z'),
      is_all_day: false
    };

    await expect(createCalendarEvent(testInput)).rejects.toThrow(/foreign key constraint/i);
  });

  it('should handle optional fields as undefined', async () => {
    // Test with undefined optional fields (not null)
    const testInput: CreateCalendarEventInput = {
      user_id: testUserId,
      title: 'Undefined Fields Event',
      start_time: new Date('2024-01-15T09:00:00Z'),
      end_time: new Date('2024-01-15T10:00:00Z'),
      description: undefined,
      location: undefined,
      is_all_day: false
    };

    const result = await createCalendarEvent(testInput);

    expect(result.description).toBeNull();
    expect(result.location).toBeNull();
  });
});