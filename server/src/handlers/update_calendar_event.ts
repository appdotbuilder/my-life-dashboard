import { db } from '../db';
import { calendarEventsTable } from '../db/schema';
import { type UpdateCalendarEventInput, type CalendarEvent } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCalendarEvent = async (input: UpdateCalendarEventInput): Promise<CalendarEvent> => {
  try {
    // Build the update object with only the fields that are provided
    const updateData: Partial<typeof calendarEventsTable.$inferInsert> = {};
    
    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.start_time !== undefined) {
      updateData.start_time = input.start_time;
    }
    if (input.end_time !== undefined) {
      updateData.end_time = input.end_time;
    }
    if (input.location !== undefined) {
      updateData.location = input.location;
    }
    if (input.is_all_day !== undefined) {
      updateData.is_all_day = input.is_all_day;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update the calendar event
    const result = await db
      .update(calendarEventsTable)
      .set(updateData)
      .where(eq(calendarEventsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Calendar event with ID ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Calendar event update failed:', error);
    throw error;
  }
};