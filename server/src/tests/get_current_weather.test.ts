import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, weatherTable } from '../db/schema';
import { type GetCurrentWeatherInput, type CreateUserInput, type CreateWeatherInput } from '../schema';
import { getCurrentWeather } from '../handlers/get_current_weather';

// Test user data
const testUser: CreateUserInput = {
  name: 'John Doe',
  email: 'john@example.com',
  location: 'Toronto'
};

// Test weather data
const testWeatherData: CreateWeatherInput[] = [
  {
    user_id: 1, // Will be set after user creation
    location: 'Toronto',
    temperature: 23.5,
    condition: 'Sunny',
    humidity: 45,
    wind_speed: 12.3
  },
  {
    user_id: 1, // Will be set after user creation
    location: 'Toronto',
    temperature: 18.2,
    condition: 'Cloudy',
    humidity: 60,
    wind_speed: 8.7
  }
];

describe('getCurrentWeather', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return the most recent weather record for a user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email,
        location: testUser.location
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple weather records with different timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Insert older weather record first
    await db.insert(weatherTable)
      .values({
        user_id: userId,
        location: testWeatherData[1].location,
        temperature: testWeatherData[1].temperature.toString(),
        condition: testWeatherData[1].condition,
        humidity: testWeatherData[1].humidity,
        wind_speed: testWeatherData[1].wind_speed.toString(),
        recorded_at: oneHourAgo
      })
      .execute();

    // Insert newer weather record
    await db.insert(weatherTable)
      .values({
        user_id: userId,
        location: testWeatherData[0].location,
        temperature: testWeatherData[0].temperature.toString(),
        condition: testWeatherData[0].condition,
        humidity: testWeatherData[0].humidity,
        wind_speed: testWeatherData[0].wind_speed.toString(),
        recorded_at: now
      })
      .execute();

    const input: GetCurrentWeatherInput = { user_id: userId };
    const result = await getCurrentWeather(input);

    // Should return the most recent weather record
    expect(result).not.toBeNull();
    expect(result!.user_id).toEqual(userId);
    expect(result!.location).toEqual('Toronto');
    expect(result!.temperature).toEqual(23.5);
    expect(typeof result!.temperature).toBe('number');
    expect(result!.condition).toEqual('Sunny');
    expect(result!.humidity).toEqual(45);
    expect(result!.wind_speed).toEqual(12.3);
    expect(typeof result!.wind_speed).toBe('number');
    expect(result!.id).toBeDefined();
    expect(result!.recorded_at).toBeInstanceOf(Date);
  });

  it('should return null when user has no weather records', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email,
        location: testUser.location
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const input: GetCurrentWeatherInput = { user_id: userId };
    
    const result = await getCurrentWeather(input);

    expect(result).toBeNull();
  });

  it('should return null for non-existent user', async () => {
    const input: GetCurrentWeatherInput = { user_id: 999 };
    
    const result = await getCurrentWeather(input);

    expect(result).toBeNull();
  });

  it('should correctly order multiple weather records by recorded_at', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email,
        location: testUser.location
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create weather records with different timestamps
    const now = new Date();
    const timestamps = [
      new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
      new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago (most recent)
      new Date(now.getTime() - 2 * 60 * 60 * 1000)  // 2 hours ago
    ];

    const temperatures = [15.0, 25.0, 20.0]; // corresponding temperatures

    // Insert records in non-chronological order
    for (let i = 0; i < 3; i++) {
      await db.insert(weatherTable)
        .values({
          user_id: userId,
          location: 'Toronto',
          temperature: temperatures[i].toString(),
          condition: 'Clear',
          humidity: 50,
          wind_speed: '10.0',
          recorded_at: timestamps[i]
        })
        .execute();
    }

    const input: GetCurrentWeatherInput = { user_id: userId };
    const result = await getCurrentWeather(input);

    // Should return the weather record with the most recent timestamp (1 hour ago, temperature 25.0)
    expect(result).not.toBeNull();
    expect(result!.temperature).toEqual(25.0);
    expect(result!.recorded_at.getTime()).toEqual(timestamps[1].getTime());
  });
});