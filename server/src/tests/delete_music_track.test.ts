import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, musicTracksTable } from '../db/schema';
import { type CreateUserInput, type CreateMusicTrackInput } from '../schema';
import { deleteMusicTrack } from '../handlers/delete_music_track';
import { eq } from 'drizzle-orm';

// Test user input
const testUserInput: CreateUserInput = {
  name: 'Test User',
  email: 'test@example.com',
  location: 'Test Location'
};

// Test music track input
const testTrackInput: CreateMusicTrackInput = {
  user_id: 1, // Will be set after user creation
  title: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  duration_seconds: 180,
  genre: 'Rock',
  spotify_url: 'https://open.spotify.com/track/test',
  is_favorite: true
};

describe('deleteMusicTrack', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing music track', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        name: testUserInput.name,
        email: testUserInput.email,
        location: testUserInput.location
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create music track
    const trackResult = await db.insert(musicTracksTable)
      .values({
        ...testTrackInput,
        user_id: userId
      })
      .returning()
      .execute();

    const trackId = trackResult[0].id;

    // Delete the track
    const result = await deleteMusicTrack(trackId);

    // Verify deletion was successful
    expect(result).toBe(true);

    // Verify track is no longer in database
    const tracks = await db.select()
      .from(musicTracksTable)
      .where(eq(musicTracksTable.id, trackId))
      .execute();

    expect(tracks).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent track', async () => {
    const nonExistentId = 999;
    
    const result = await deleteMusicTrack(nonExistentId);

    expect(result).toBe(false);
  });

  it('should not affect other tracks when deleting one track', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        name: testUserInput.name,
        email: testUserInput.email,
        location: testUserInput.location
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create two music tracks
    const track1Result = await db.insert(musicTracksTable)
      .values({
        ...testTrackInput,
        user_id: userId,
        title: 'Track 1'
      })
      .returning()
      .execute();

    const track2Result = await db.insert(musicTracksTable)
      .values({
        ...testTrackInput,
        user_id: userId,
        title: 'Track 2'
      })
      .returning()
      .execute();

    const track1Id = track1Result[0].id;
    const track2Id = track2Result[0].id;

    // Delete first track
    const result = await deleteMusicTrack(track1Id);

    expect(result).toBe(true);

    // Verify first track is deleted
    const deletedTracks = await db.select()
      .from(musicTracksTable)
      .where(eq(musicTracksTable.id, track1Id))
      .execute();

    expect(deletedTracks).toHaveLength(0);

    // Verify second track still exists
    const remainingTracks = await db.select()
      .from(musicTracksTable)
      .where(eq(musicTracksTable.id, track2Id))
      .execute();

    expect(remainingTracks).toHaveLength(1);
    expect(remainingTracks[0].title).toEqual('Track 2');
  });

  it('should handle multiple deletion attempts on same track ID', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        name: testUserInput.name,
        email: testUserInput.email,
        location: testUserInput.location
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create music track
    const trackResult = await db.insert(musicTracksTable)
      .values({
        ...testTrackInput,
        user_id: userId
      })
      .returning()
      .execute();

    const trackId = trackResult[0].id;

    // First deletion should succeed
    const firstResult = await deleteMusicTrack(trackId);
    expect(firstResult).toBe(true);

    // Second deletion attempt should return false
    const secondResult = await deleteMusicTrack(trackId);
    expect(secondResult).toBe(false);
  });
});