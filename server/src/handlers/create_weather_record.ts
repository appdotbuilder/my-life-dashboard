import { db } from '../db';
import { weatherTable, usersTable } from '../db/schema';
import { type CreateWeatherInput, type Weather } from '../schema';
import { eq } from 'drizzle-orm';

export async function createWeatherRecord(input: CreateWeatherInput): Promise<Weather> {
  try {
    // Verify that the user exists to prevent foreign key constraint violations
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Insert weather record with numeric conversions for temperature and wind_speed
    const result = await db.insert(weatherTable)
      .values({
        user_id: input.user_id,
        location: input.location,
        temperature: input.temperature.toString(), // Convert number to string for numeric column
        condition: input.condition,
        humidity: input.humidity, // Integer column - no conversion needed
        wind_speed: input.wind_speed.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const weatherRecord = result[0];
    return {
      ...weatherRecord,
      temperature: parseFloat(weatherRecord.temperature), // Convert string back to number
      wind_speed: parseFloat(weatherRecord.wind_speed) // Convert string back to number
    };
  } catch (error) {
    console.error('Weather record creation failed:', error);
    throw error;
  }
}