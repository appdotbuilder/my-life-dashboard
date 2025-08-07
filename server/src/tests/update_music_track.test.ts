import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, musicTracksTable } from '../db/schema';
import { type UpdateMusicTrackInput, type CreateUserInput } from '../schema';
import { updateMusicTrack } from '../handlers/update_music_track';
import { eq } from 'drizzle-orm';

// Test user data
const testUser: CreateUserInput = {
  name: 'Test User',
  email: 'test@example.com',
  location: 'Test City'
};

describe('updateMusicTrack', () => {
  let userId: number;
  let trackId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = users[0].id;

    // Create test music track
    const tracks = await db.insert(musicTracksTable)
      .values({
        user_id: userId,
        title: 'Original Song',
        artist: 'Original Artist',
        album: 'Original Album',
        duration_seconds: 240,
        genre: 'Rock',
        spotify_url: 'https://spotify.com/original',
        is_favorite: false
      })
      .returning()
      .execute();
    trackId = tracks[0].id;
  });

  afterEach(resetDB);

  it('should update all fields of a music track', async () => {
    const updateInput: UpdateMusicTrackInput = {
      id: trackId,
      title: 'Updated Song',
      artist: 'Updated Artist',
      album: 'Updated Album',
      duration_seconds: 300,
      genre: 'Pop',
      spotify_url: 'https://spotify.com/updated',
      is_favorite: true
    };

    const result = await updateMusicTrack(updateInput);

    expect(result.id).toEqual(trackId);
    expect(result.user_id).toEqual(userId);
    expect(result.title).toEqual('Updated Song');
    expect(result.artist).toEqual('Updated Artist');
    expect(result.album).toEqual('Updated Album');
    expect(result.duration_seconds).toEqual(300);
    expect(result.genre).toEqual('Pop');
    expect(result.spotify_url).toEqual('https://spotify.com/updated');
    expect(result.is_favorite).toEqual(true);
    expect(result.added_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    const updateInput: UpdateMusicTrackInput = {
      id: trackId,
      title: 'Partially Updated Song',
      is_favorite: true
    };

    const result = await updateMusicTrack(updateInput);

    expect(result.title).toEqual('Partially Updated Song');
    expect(result.is_favorite).toEqual(true);
    // Other fields should remain unchanged
    expect(result.artist).toEqual('Original Artist');
    expect(result.album).toEqual('Original Album');
    expect(result.duration_seconds).toEqual(240);
    expect(result.genre).toEqual('Rock');
    expect(result.spotify_url).toEqual('https://spotify.com/original');
  });

  it('should set nullable fields to null when specified', async () => {
    const updateInput: UpdateMusicTrackInput = {
      id: trackId,
      album: null,
      genre: null,
      spotify_url: null
    };

    const result = await updateMusicTrack(updateInput);

    expect(result.album).toBeNull();
    expect(result.genre).toBeNull();
    expect(result.spotify_url).toBeNull();
    // Other fields should remain unchanged
    expect(result.title).toEqual('Original Song');
    expect(result.artist).toEqual('Original Artist');
    expect(result.is_favorite).toEqual(false);
  });

  it('should persist changes to database', async () => {
    const updateInput: UpdateMusicTrackInput = {
      id: trackId,
      title: 'Database Test Song',
      artist: 'Database Test Artist',
      is_favorite: true
    };

    await updateMusicTrack(updateInput);

    // Query database directly to verify changes
    const tracks = await db.select()
      .from(musicTracksTable)
      .where(eq(musicTracksTable.id, trackId))
      .execute();

    expect(tracks).toHaveLength(1);
    expect(tracks[0].title).toEqual('Database Test Song');
    expect(tracks[0].artist).toEqual('Database Test Artist');
    expect(tracks[0].is_favorite).toEqual(true);
  });

  it('should handle empty update gracefully', async () => {
    const updateInput: UpdateMusicTrackInput = {
      id: trackId
    };

    const result = await updateMusicTrack(updateInput);

    // Should return existing record unchanged
    expect(result.id).toEqual(trackId);
    expect(result.title).toEqual('Original Song');
    expect(result.artist).toEqual('Original Artist');
    expect(result.album).toEqual('Original Album');
    expect(result.duration_seconds).toEqual(240);
    expect(result.genre).toEqual('Rock');
    expect(result.spotify_url).toEqual('https://spotify.com/original');
    expect(result.is_favorite).toEqual(false);
  });

  it('should throw error for non-existent track', async () => {
    const updateInput: UpdateMusicTrackInput = {
      id: 99999,
      title: 'Non-existent Track'
    };

    expect(updateMusicTrack(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should update track with very long duration', async () => {
    const updateInput: UpdateMusicTrackInput = {
      id: trackId,
      duration_seconds: 7200 // 2 hours
    };

    const result = await updateMusicTrack(updateInput);

    expect(result.duration_seconds).toEqual(7200);
  });

  it('should handle boolean toggle correctly', async () => {
    // First set to true
    await updateMusicTrack({
      id: trackId,
      is_favorite: true
    });

    // Then toggle back to false
    const result = await updateMusicTrack({
      id: trackId,
      is_favorite: false
    });

    expect(result.is_favorite).toEqual(false);
  });
});