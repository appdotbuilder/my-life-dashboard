import { db } from '../db';
import { musicTracksTable } from '../db/schema';
import { type CreateMusicTrackInput, type MusicTrack } from '../schema';

export const createMusicTrack = async (input: CreateMusicTrackInput): Promise<MusicTrack> => {
  try {
    // Insert music track record
    const result = await db.insert(musicTracksTable)
      .values({
        user_id: input.user_id,
        title: input.title,
        artist: input.artist,
        album: input.album || null,
        duration_seconds: input.duration_seconds,
        genre: input.genre || null,
        spotify_url: input.spotify_url || null,
        is_favorite: input.is_favorite
      })
      .returning()
      .execute();

    // Return the created music track
    const musicTrack = result[0];
    return musicTrack;
  } catch (error) {
    console.error('Music track creation failed:', error);
    throw error;
  }
};