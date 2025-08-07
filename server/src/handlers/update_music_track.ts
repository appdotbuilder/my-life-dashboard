import { db } from '../db';
import { musicTracksTable } from '../db/schema';
import { type UpdateMusicTrackInput, type MusicTrack } from '../schema';
import { eq } from 'drizzle-orm';

export const updateMusicTrack = async (input: UpdateMusicTrackInput): Promise<MusicTrack> => {
  try {
    // Build the update values object, excluding undefined fields
    const updateValues: Partial<typeof musicTracksTable.$inferInsert> = {};
    
    if (input.title !== undefined) {
      updateValues.title = input.title;
    }
    
    if (input.artist !== undefined) {
      updateValues.artist = input.artist;
    }
    
    if (input.album !== undefined) {
      updateValues.album = input.album;
    }
    
    if (input.duration_seconds !== undefined) {
      updateValues.duration_seconds = input.duration_seconds;
    }
    
    if (input.genre !== undefined) {
      updateValues.genre = input.genre;
    }
    
    if (input.spotify_url !== undefined) {
      updateValues.spotify_url = input.spotify_url;
    }
    
    if (input.is_favorite !== undefined) {
      updateValues.is_favorite = input.is_favorite;
    }

    // If no fields to update, just return the existing record
    if (Object.keys(updateValues).length === 0) {
      const existing = await db.select()
        .from(musicTracksTable)
        .where(eq(musicTracksTable.id, input.id))
        .execute();
        
      if (existing.length === 0) {
        throw new Error(`Music track with id ${input.id} not found`);
      }
      
      return existing[0];
    }

    // Update the record
    const result = await db.update(musicTracksTable)
      .set(updateValues)
      .where(eq(musicTracksTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Music track with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Music track update failed:', error);
    throw error;
  }
};