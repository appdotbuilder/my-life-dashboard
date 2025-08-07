import { db } from '../db';
import { musicTracksTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteMusicTrack(trackId: number): Promise<boolean> {
  try {
    // Delete the music track by ID
    const result = await db.delete(musicTracksTable)
      .where(eq(musicTracksTable.id, trackId))
      .execute();

    // Return true if at least one row was affected (deleted)
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Music track deletion failed:', error);
    throw error;
  }
}