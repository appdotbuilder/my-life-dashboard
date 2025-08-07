import { db } from '../db';
import { musicTracksTable } from '../db/schema';
import { type GetUserMusicTracksInput, type MusicTrack } from '../schema';
import { eq, and, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function getUserMusicTracks(input: GetUserMusicTracksInput): Promise<MusicTrack[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by user_id
    conditions.push(eq(musicTracksTable.user_id, input.user_id));
    
    // Add favorites filter if specified
    if (input.favorites_only === true) {
      conditions.push(eq(musicTracksTable.is_favorite, true));
    }

    // Build the complete query in one go
    const results = await db.select()
      .from(musicTracksTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(musicTracksTable.added_at))
      .execute();

    // Convert numeric fields back to numbers (duration_seconds is integer so no conversion needed)
    return results.map(track => ({
      ...track,
      // No numeric field conversions needed for music tracks - all are already correct types
    }));
  } catch (error) {
    console.error('Failed to fetch user music tracks:', error);
    throw error;
  }
}