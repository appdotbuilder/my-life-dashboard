import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { weatherTable, usersTable } from '../db/schema';
import { type CreateWeatherInput } from '../schema';
import { createWeatherRecord } from '../handlers/create_weather_record';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateWeatherInput = {
  user_id: 1,
  location: 'New York, NY',
  temperature: 23.45,
  condition: 'Sunny',
  humidity: 65,
  wind_speed: 12.5
};

describe('createWeatherRecord', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a weather record', async () => {
    // Create a user first for foreign key constraint
    await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .execute();

    const result = await createWeatherRecord(testInput);

    // Verify all fields are present and correctly typed
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(1);
    expect(result.location).toEqual('New York, NY');
    expect(result.temperature).toEqual(23.45);
    expect(typeof result.temperature).toBe('number'); // Verify numeric conversion
    expect(result.condition).toEqual('Sunny');
    expect(result.humidity).toEqual(65);
    expect(result.wind_speed).toEqual(12.5);
    expect(typeof result.wind_speed).toBe('number'); // Verify numeric conversion
    expect(result.recorded_at).toBeInstanceOf(Date);
  });

  it('should save weather record to database', async () => {
    // Create a user first
    await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .execute();

    const result = await createWeatherRecord(testInput);

    // Query database to verify the record was saved
    const weatherRecords = await db.select()
      .from(weatherTable)
      .where(eq(weatherTable.id, result.id))
      .execute();

    expect(weatherRecords).toHaveLength(1);
    
    const savedRecord = weatherRecords[0];
    expect(savedRecord.user_id).toEqual(1);
    expect(savedRecord.location).toEqual('New York, NY');
    expect(parseFloat(savedRecord.temperature)).toEqual(23.45); // Database stores as string
    expect(savedRecord.condition).toEqual('Sunny');
    expect(savedRecord.humidity).toEqual(65);
    expect(parseFloat(savedRecord.wind_speed)).toEqual(12.5); // Database stores as string
    expect(savedRecord.recorded_at).toBeInstanceOf(Date);
  });

  it('should handle negative temperatures correctly', async () => {
    // Create a user first
    await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .execute();

    const winterInput: CreateWeatherInput = {
      ...testInput,
      temperature: -15.2,
      condition: 'Snow'
    };

    const result = await createWeatherRecord(winterInput);

    expect(result.temperature).toEqual(-15.2);
    expect(typeof result.temperature).toBe('number');
    expect(result.condition).toEqual('Snow');
  });

  it('should handle boundary values correctly', async () => {
    // Create a user first
    await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .execute();

    const boundaryInput: CreateWeatherInput = {
      ...testInput,
      temperature: 0,
      humidity: 0,
      wind_speed: 0
    };

    const result = await createWeatherRecord(boundaryInput);

    expect(result.temperature).toEqual(0);
    expect(result.humidity).toEqual(0);
    expect(result.wind_speed).toEqual(0);
    expect(typeof result.temperature).toBe('number');
    expect(typeof result.wind_speed).toBe('number');
  });

  it('should throw error when user does not exist', async () => {
    // Don't create a user - this should cause foreign key constraint error
    expect(createWeatherRecord(testInput)).rejects.toThrow(/user.*not found/i);
  });

  it('should handle high precision decimal values', async () => {
    // Create a user first
    await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .execute();

    const preciseInput: CreateWeatherInput = {
      ...testInput,
      temperature: 23.456789,
      wind_speed: 15.987654
    };

    const result = await createWeatherRecord(preciseInput);

    // Verify precision is maintained (up to database column precision)
    expect(result.temperature).toBeCloseTo(23.46, 2); // Database precision is 5,2
    expect(result.wind_speed).toBeCloseTo(15.99, 2);  // Database precision is 5,2
    expect(typeof result.temperature).toBe('number');
    expect(typeof result.wind_speed).toBe('number');
  });
});