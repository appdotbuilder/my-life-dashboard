import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, calendarEventsTable } from '../db/schema';
import { type UpdateCalendarEventInput } from '../schema';
import { updateCalendarEvent } from '../handlers/update_calendar_event';
import { eq } from 'drizzle-orm';

describe('updateCalendarEvent', () => {
  let testUserId: number;
  let testEventId: number;

  beforeEach(async () => {
    await createDB();

    // Create a test user
    const userResult = await db
      .insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        location: 'Test City'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;

    // Create a test calendar event
    const eventResult = await db
      .insert(calendarEventsTable)
      .values({
        user_id: testUserId,
        title: 'Original Event',
        description: 'Original description',
        start_time: new Date('2024-01-15T10:00:00Z'),
        end_time: new Date('2024-01-15T11:00:00Z'),
        location: 'Original Location',
        is_all_day: false
      })
      .returning()
      .execute();

    testEventId = eventResult[0].id;
  });

  afterEach(resetDB);

  it('should update a calendar event with all fields', async () => {
    const updateInput: UpdateCalendarEventInput = {
      id: testEventId,
      title: 'Updated Event',
      description: 'Updated description',
      start_time: new Date('2024-01-15T14:00:00Z'),
      end_time: new Date('2024-01-15T15:00:00Z'),
      location: 'Updated Location',
      is_all_day: true
    };

    const result = await updateCalendarEvent(updateInput);

    expect(result.id).toEqual(testEventId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.title).toEqual('Updated Event');
    expect(result.description).toEqual('Updated description');
    expect(result.start_time).toEqual(new Date('2024-01-15T14:00:00Z'));
    expect(result.end_time).toEqual(new Date('2024-01-15T15:00:00Z'));
    expect(result.location).toEqual('Updated Location');
    expect(result.is_all_day).toEqual(true);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    const updateInput: UpdateCalendarEventInput = {
      id: testEventId,
      title: 'Partially Updated Event',
      is_all_day: true
    };

    const result = await updateCalendarEvent(updateInput);

    expect(result.title).toEqual('Partially Updated Event');
    expect(result.is_all_day).toEqual(true);
    // Other fields should remain unchanged
    expect(result.description).toEqual('Original description');
    expect(result.location).toEqual('Original Location');
    expect(result.start_time).toEqual(new Date('2024-01-15T10:00:00Z'));
    expect(result.end_time).toEqual(new Date('2024-01-15T11:00:00Z'));
  });

  it('should handle nullable fields correctly', async () => {
    const updateInput: UpdateCalendarEventInput = {
      id: testEventId,
      description: null,
      location: null
    };

    const result = await updateCalendarEvent(updateInput);

    expect(result.description).toBeNull();
    expect(result.location).toBeNull();
    expect(result.title).toEqual('Original Event'); // Should remain unchanged
  });

  it('should update the updated_at timestamp', async () => {
    // Get the original updated_at timestamp
    const originalEvent = await db
      .select()
      .from(calendarEventsTable)
      .where(eq(calendarEventsTable.id, testEventId))
      .execute();

    const originalUpdatedAt = originalEvent[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateCalendarEventInput = {
      id: testEventId,
      title: 'Updated for timestamp test'
    };

    const result = await updateCalendarEvent(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should save updates to database', async () => {
    const updateInput: UpdateCalendarEventInput = {
      id: testEventId,
      title: 'Database Update Test',
      description: 'Testing database persistence',
      is_all_day: true
    };

    await updateCalendarEvent(updateInput);

    // Query the database directly to verify changes were persisted
    const events = await db
      .select()
      .from(calendarEventsTable)
      .where(eq(calendarEventsTable.id, testEventId))
      .execute();

    expect(events).toHaveLength(1);
    expect(events[0].title).toEqual('Database Update Test');
    expect(events[0].description).toEqual('Testing database persistence');
    expect(events[0].is_all_day).toEqual(true);
  });

  it('should throw error for non-existent event', async () => {
    const updateInput: UpdateCalendarEventInput = {
      id: 99999, // Non-existent ID
      title: 'This should fail'
    };

    await expect(updateCalendarEvent(updateInput)).rejects.toThrow(/Calendar event with ID 99999 not found/i);
  });

  it('should handle date updates correctly', async () => {
    const newStartTime = new Date('2024-06-01T09:00:00Z');
    const newEndTime = new Date('2024-06-01T17:00:00Z');

    const updateInput: UpdateCalendarEventInput = {
      id: testEventId,
      start_time: newStartTime,
      end_time: newEndTime
    };

    const result = await updateCalendarEvent(updateInput);

    expect(result.start_time).toEqual(newStartTime);
    expect(result.end_time).toEqual(newEndTime);
    expect(result.start_time).toBeInstanceOf(Date);
    expect(result.end_time).toBeInstanceOf(Date);
  });

  it('should preserve original created_at timestamp', async () => {
    // Get the original created_at timestamp
    const originalEvent = await db
      .select()
      .from(calendarEventsTable)
      .where(eq(calendarEventsTable.id, testEventId))
      .execute();

    const originalCreatedAt = originalEvent[0].created_at;

    const updateInput: UpdateCalendarEventInput = {
      id: testEventId,
      title: 'Testing created_at preservation'
    };

    const result = await updateCalendarEvent(updateInput);

    expect(result.created_at.getTime()).toEqual(originalCreatedAt.getTime());
  });
});