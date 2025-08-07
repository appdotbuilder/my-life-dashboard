import { db } from '../db';
import { weatherTable } from '../db/schema';
import { type GetCurrentWeatherInput, type Weather } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getCurrentWeather = async (input: GetCurrentWeatherInput): Promise<Weather | null> => {
  try {
    // Query for the most recent weather record for the user
    const results = await db.select()
      .from(weatherTable)
      .where(eq(weatherTable.user_id, input.user_id))
      .orderBy(desc(weatherTable.recorded_at))
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const weatherRecord = results[0];
    return {
      ...weatherRecord,
      temperature: parseFloat(weatherRecord.temperature),
      wind_speed: parseFloat(weatherRecord.wind_speed)
    };
  } catch (error) {
    console.error('Get current weather failed:', error);
    throw error;
  }
};