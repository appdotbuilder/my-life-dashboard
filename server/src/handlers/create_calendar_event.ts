import { db } from '../db';
import { calendarEventsTable } from '../db/schema';
import { type CreateCalendarEventInput, type CalendarEvent } from '../schema';

export const createCalendarEvent = async (input: CreateCalendarEventInput): Promise<CalendarEvent> => {
  try {
    // Insert calendar event record
    const result = await db.insert(calendarEventsTable)
      .values({
        user_id: input.user_id,
        title: input.title,
        description: input.description ?? null,
        start_time: input.start_time,
        end_time: input.end_time,
        location: input.location ?? null,
        is_all_day: input.is_all_day
      })
      .returning()
      .execute();

    // Return the created calendar event
    const calendarEvent = result[0];
    return calendarEvent;
  } catch (error) {
    console.error('Calendar event creation failed:', error);
    throw error;
  }
};