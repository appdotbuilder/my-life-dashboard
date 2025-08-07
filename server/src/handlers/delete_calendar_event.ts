import { db } from '../db';
import { calendarEventsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteCalendarEvent = async (eventId: number): Promise<boolean> => {
  try {
    // Delete the calendar event by ID
    const result = await db.delete(calendarEventsTable)
      .where(eq(calendarEventsTable.id, eventId))
      .returning()
      .execute();

    // Return true if a row was deleted, false if no event was found
    return result.length > 0;
  } catch (error) {
    console.error('Calendar event deletion failed:', error);
    throw error;
  }
};