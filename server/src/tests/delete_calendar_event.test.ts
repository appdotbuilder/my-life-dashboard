import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, calendarEventsTable } from '../db/schema';
import { deleteCalendarEvent } from '../handlers/delete_calendar_event';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  location: 'Test Location'
};

// Test calendar event data
const testEvent = {
  title: 'Test Event',
  description: 'A test calendar event',
  start_time: new Date('2024-01-15T10:00:00Z'),
  end_time: new Date('2024-01-15T11:00:00Z'),
  location: 'Test Venue',
  is_all_day: false
};

describe('deleteCalendarEvent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing calendar event', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create a calendar event
    const eventResult = await db.insert(calendarEventsTable)
      .values({
        ...testEvent,
        user_id: userId
      })
      .returning()
      .execute();
    const eventId = eventResult[0].id;

    // Delete the event
    const deleteResult = await deleteCalendarEvent(eventId);

    // Verify deletion was successful
    expect(deleteResult).toBe(true);

    // Verify event no longer exists in database
    const events = await db.select()
      .from(calendarEventsTable)
      .where(eq(calendarEventsTable.id, eventId))
      .execute();

    expect(events).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent event', async () => {
    const nonExistentEventId = 99999;

    // Attempt to delete non-existent event
    const deleteResult = await deleteCalendarEvent(nonExistentEventId);

    // Should return false since no event was found
    expect(deleteResult).toBe(false);
  });

  it('should not affect other calendar events when deleting one event', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create multiple calendar events
    const event1Result = await db.insert(calendarEventsTable)
      .values({
        ...testEvent,
        user_id: userId,
        title: 'Event 1'
      })
      .returning()
      .execute();

    const event2Result = await db.insert(calendarEventsTable)
      .values({
        ...testEvent,
        user_id: userId,
        title: 'Event 2'
      })
      .returning()
      .execute();

    const event1Id = event1Result[0].id;
    const event2Id = event2Result[0].id;

    // Delete only the first event
    const deleteResult = await deleteCalendarEvent(event1Id);

    // Verify deletion was successful
    expect(deleteResult).toBe(true);

    // Verify first event is gone
    const deletedEvents = await db.select()
      .from(calendarEventsTable)
      .where(eq(calendarEventsTable.id, event1Id))
      .execute();
    expect(deletedEvents).toHaveLength(0);

    // Verify second event still exists
    const remainingEvents = await db.select()
      .from(calendarEventsTable)
      .where(eq(calendarEventsTable.id, event2Id))
      .execute();
    expect(remainingEvents).toHaveLength(1);
    expect(remainingEvents[0].title).toEqual('Event 2');
  });

  it('should handle deletion of events with all possible field combinations', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create event with minimal required fields (nullable fields as null)
    const minimalEvent = {
      user_id: userId,
      title: 'Minimal Event',
      description: null,
      start_time: new Date('2024-01-20T14:00:00Z'),
      end_time: new Date('2024-01-20T15:00:00Z'),
      location: null,
      is_all_day: true
    };

    const eventResult = await db.insert(calendarEventsTable)
      .values(minimalEvent)
      .returning()
      .execute();
    const eventId = eventResult[0].id;

    // Delete the minimal event
    const deleteResult = await deleteCalendarEvent(eventId);

    // Verify deletion was successful
    expect(deleteResult).toBe(true);

    // Verify event no longer exists
    const events = await db.select()
      .from(calendarEventsTable)
      .where(eq(calendarEventsTable.id, eventId))
      .execute();
    expect(events).toHaveLength(0);
  });
});