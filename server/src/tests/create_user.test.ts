import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs
const testInputWithLocation: CreateUserInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  location: 'New York, NY'
};

const testInputWithoutLocation: CreateUserInput = {
  name: 'Jane Smith',
  email: 'jane.smith@example.com'
};

const testInputWithNullLocation: CreateUserInput = {
  name: 'Bob Johnson',
  email: 'bob.johnson@example.com',
  location: null
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with location', async () => {
    const result = await createUser(testInputWithLocation);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.location).toEqual('New York, NY');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a user without location', async () => {
    const result = await createUser(testInputWithoutLocation);

    // Basic field validation
    expect(result.name).toEqual('Jane Smith');
    expect(result.email).toEqual('jane.smith@example.com');
    expect(result.location).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a user with explicit null location', async () => {
    const result = await createUser(testInputWithNullLocation);

    // Basic field validation
    expect(result.name).toEqual('Bob Johnson');
    expect(result.email).toEqual('bob.johnson@example.com');
    expect(result.location).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInputWithLocation);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('John Doe');
    expect(users[0].email).toEqual('john.doe@example.com');
    expect(users[0].location).toEqual('New York, NY');
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should enforce email uniqueness constraint', async () => {
    // Create first user
    await createUser(testInputWithLocation);

    // Try to create another user with same email
    const duplicateEmailInput: CreateUserInput = {
      name: 'Different Name',
      email: 'john.doe@example.com', // Same email
      location: 'Different Location'
    };

    // Should throw due to unique constraint
    await expect(createUser(duplicateEmailInput)).rejects.toThrow(/unique/i);
  });

  it('should create multiple users with different emails', async () => {
    const user1 = await createUser(testInputWithLocation);
    const user2 = await createUser(testInputWithoutLocation);

    // Verify both users were created
    expect(user1.id).not.toEqual(user2.id);
    expect(user1.email).not.toEqual(user2.email);

    // Verify both exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });

  it('should handle special characters in name and location', async () => {
    const specialInput: CreateUserInput = {
      name: 'José María O\'Connor-Smith',
      email: 'jose.maria@example.com',
      location: 'São Paulo, BR'
    };

    const result = await createUser(specialInput);

    expect(result.name).toEqual('José María O\'Connor-Smith');
    expect(result.location).toEqual('São Paulo, BR');
  });

  it('should handle long strings within limits', async () => {
    const longInput: CreateUserInput = {
      name: 'A'.repeat(100), // Long but reasonable name
      email: 'long.email.address.for.testing@very-long-domain-name.com',
      location: 'This is a very long location string that should still be acceptable'
    };

    const result = await createUser(longInput);

    expect(result.name).toEqual(longInput.name);
    expect(result.email).toEqual(longInput.email);
    expect(result.location).toEqual('This is a very long location string that should still be acceptable');
  });
});