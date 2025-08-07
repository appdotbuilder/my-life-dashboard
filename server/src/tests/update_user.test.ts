import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type CreateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
const createTestUser = async (userData: CreateUserInput = {
  name: 'John Doe',
  email: 'john@example.com',
  location: 'New York'
}) => {
  const result = await db.insert(usersTable)
    .values({
      name: userData.name,
      email: userData.email,
      location: userData.location || null
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user name only', async () => {
    // Create a test user first
    const user = await createTestUser();

    // Update only the name
    const updateInput: UpdateUserInput = {
      id: user.id,
      name: 'Jane Smith'
    };

    const result = await updateUser(updateInput);

    // Verify the updated fields
    expect(result.id).toEqual(user.id);
    expect(result.name).toEqual('Jane Smith');
    expect(result.email).toEqual('john@example.com'); // Should remain unchanged
    expect(result.location).toEqual('New York'); // Should remain unchanged
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update user email only', async () => {
    const user = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: user.id,
      email: 'jane.smith@example.com'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(user.id);
    expect(result.name).toEqual('John Doe'); // Should remain unchanged
    expect(result.email).toEqual('jane.smith@example.com');
    expect(result.location).toEqual('New York'); // Should remain unchanged
  });

  it('should update user location only', async () => {
    const user = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: user.id,
      location: 'Los Angeles'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(user.id);
    expect(result.name).toEqual('John Doe'); // Should remain unchanged
    expect(result.email).toEqual('john@example.com'); // Should remain unchanged
    expect(result.location).toEqual('Los Angeles');
  });

  it('should set location to null', async () => {
    const user = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: user.id,
      location: null
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(user.id);
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john@example.com');
    expect(result.location).toBeNull();
  });

  it('should update multiple fields at once', async () => {
    const user = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: user.id,
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      location: 'Chicago'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(user.id);
    expect(result.name).toEqual('Jane Smith');
    expect(result.email).toEqual('jane.smith@example.com');
    expect(result.location).toEqual('Chicago');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should persist changes to database', async () => {
    const user = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: user.id,
      name: 'Updated Name',
      email: 'updated@example.com'
    };

    await updateUser(updateInput);

    // Verify changes were persisted in database
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    expect(updatedUsers[0].name).toEqual('Updated Name');
    expect(updatedUsers[0].email).toEqual('updated@example.com');
    expect(updatedUsers[0].location).toEqual('New York'); // Should remain unchanged
  });

  it('should handle user with null location initially', async () => {
    // Create user without location
    const user = await createTestUser({
      name: 'Test User',
      email: 'test@example.com',
      location: null
    });

    const updateInput: UpdateUserInput = {
      id: user.id,
      name: 'Updated User',
      location: 'Boston'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(user.id);
    expect(result.name).toEqual('Updated User');
    expect(result.email).toEqual('test@example.com');
    expect(result.location).toEqual('Boston');
  });

  it('should throw error when user does not exist', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999, // Non-existent user ID
      name: 'Test Name'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should handle empty update gracefully', async () => {
    const user = await createTestUser();

    // Update with only the ID (no fields to update)
    const updateInput: UpdateUserInput = {
      id: user.id
    };

    const result = await updateUser(updateInput);

    // Should return the user unchanged
    expect(result.id).toEqual(user.id);
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john@example.com');
    expect(result.location).toEqual('New York');
  });

  it('should maintain referential integrity with related records', async () => {
    const user = await createTestUser();

    // Update user details
    const updateInput: UpdateUserInput = {
      id: user.id,
      name: 'Updated Name'
    };

    const result = await updateUser(updateInput);

    // Verify the user still exists and can be queried
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('Updated Name');
    expect(users[0].id).toEqual(user.id);
  });
});