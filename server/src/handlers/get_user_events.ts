import { db } from '../db';
import { calendarEventsTable } from '../db/schema';
import { type GetUserEventsInput, type CalendarEvent } from '../schema';
import { eq, and, gte, lte, asc, type SQL } from 'drizzle-orm';

export async function getUserEvents(input: GetUserEventsInput): Promise<CalendarEvent[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [eq(calendarEventsTable.user_id, input.user_id)];

    // Add optional date filters
    if (input.start_date) {
      conditions.push(gte(calendarEventsTable.start_time, input.start_date));
    }

    if (input.end_date) {
      conditions.push(lte(calendarEventsTable.start_time, input.end_date));
    }

    // Build query with all conditions
    const query = db.select()
      .from(calendarEventsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(asc(calendarEventsTable.start_time));

    const results = await query.execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch user events:', error);
    throw error;
  }
}