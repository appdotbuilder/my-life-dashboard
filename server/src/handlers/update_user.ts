import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // Build the update object with only the provided fields
    const updateData: Partial<{
      name: string;
      email: string;
      location: string | null;
    }> = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.email !== undefined) {
      updateData.email = input.email;
    }

    if (input.location !== undefined) {
      updateData.location = input.location;
    }

    // If no fields to update, just return the existing user
    if (Object.keys(updateData).length === 0) {
      const result = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.id))
        .execute();

      if (result.length === 0) {
        throw new Error(`User with id ${input.id} not found`);
      }

      return result[0];
    }

    // Update the user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    // Check if user was found and updated
    if (result.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};