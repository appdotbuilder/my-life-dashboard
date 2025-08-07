import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUser } from '../handlers/get_user';

// Test user data
const testUser: CreateUserInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  location: 'New York'
};

const testUserWithoutLocation: CreateUserInput = {
  name: 'Jane Smith',
  email: 'jane.smith@example.com'
};

describe('getUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch an existing user by id', async () => {
    // Create a user first
    const insertResult = await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email,
        location: testUser.location
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];
    
    // Fetch the user using the handler
    const result = await getUser(createdUser.id);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.name).toEqual('John Doe');
    expect(result!.email).toEqual('john.doe@example.com');
    expect(result!.location).toEqual('New York');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent user', async () => {
    const result = await getUser(999);
    expect(result).toBeNull();
  });

  it('should handle user with null location', async () => {
    // Create a user without location
    const insertResult = await db.insert(usersTable)
      .values({
        name: testUserWithoutLocation.name,
        email: testUserWithoutLocation.email,
        location: null
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];
    
    // Fetch the user using the handler
    const result = await getUser(createdUser.id);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.name).toEqual('Jane Smith');
    expect(result!.email).toEqual('jane.smith@example.com');
    expect(result!.location).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should fetch correct user when multiple users exist', async () => {
    // Create multiple users
    const user1Result = await db.insert(usersTable)
      .values({
        name: 'User One',
        email: 'user1@example.com',
        location: 'Location One'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        name: 'User Two',
        email: 'user2@example.com',
        location: 'Location Two'
      })
      .returning()
      .execute();

    // Fetch specific user
    const result = await getUser(user2Result[0].id);

    // Verify we get the correct user
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(user2Result[0].id);
    expect(result!.name).toEqual('User Two');
    expect(result!.email).toEqual('user2@example.com');
    expect(result!.location).toEqual('Location Two');
  });

  it('should handle zero id correctly', async () => {
    const result = await getUser(0);
    expect(result).toBeNull();
  });

  it('should handle negative id correctly', async () => {
    const result = await getUser(-1);
    expect(result).toBeNull();
  });
});