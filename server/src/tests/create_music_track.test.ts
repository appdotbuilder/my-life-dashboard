import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, musicTracksTable } from '../db/schema';
import { type CreateMusicTrackInput } from '../schema';
import { createMusicTrack } from '../handlers/create_music_track';
import { eq } from 'drizzle-orm';

describe('createMusicTrack', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        location: 'Test City'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should create a music track with all fields', async () => {
    const testUser = await createTestUser();
    
    const testInput: CreateMusicTrackInput = {
      user_id: testUser.id,
      title: 'Test Song',
      artist: 'Test Artist',
      album: 'Test Album',
      duration_seconds: 180,
      genre: 'Pop',
      spotify_url: 'https://open.spotify.com/track/test123',
      is_favorite: true
    };

    const result = await createMusicTrack(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(testUser.id);
    expect(result.title).toEqual('Test Song');
    expect(result.artist).toEqual('Test Artist');
    expect(result.album).toEqual('Test Album');
    expect(result.duration_seconds).toEqual(180);
    expect(result.genre).toEqual('Pop');
    expect(result.spotify_url).toEqual('https://open.spotify.com/track/test123');
    expect(result.is_favorite).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.added_at).toBeInstanceOf(Date);
  });

  it('should create a music track with minimal required fields', async () => {
    const testUser = await createTestUser();
    
    const testInput: CreateMusicTrackInput = {
      user_id: testUser.id,
      title: 'Minimal Song',
      artist: 'Minimal Artist',
      duration_seconds: 120,
      is_favorite: false
    };

    const result = await createMusicTrack(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(testUser.id);
    expect(result.title).toEqual('Minimal Song');
    expect(result.artist).toEqual('Minimal Artist');
    expect(result.album).toBeNull();
    expect(result.duration_seconds).toEqual(120);
    expect(result.genre).toBeNull();
    expect(result.spotify_url).toBeNull();
    expect(result.is_favorite).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.added_at).toBeInstanceOf(Date);
  });

  it('should save music track to database', async () => {
    const testUser = await createTestUser();
    
    const testInput: CreateMusicTrackInput = {
      user_id: testUser.id,
      title: 'Database Song',
      artist: 'Database Artist',
      album: 'Database Album',
      duration_seconds: 240,
      genre: 'Rock',
      spotify_url: 'https://open.spotify.com/track/db123',
      is_favorite: true
    };

    const result = await createMusicTrack(testInput);

    // Query using proper drizzle syntax
    const musicTracks = await db.select()
      .from(musicTracksTable)
      .where(eq(musicTracksTable.id, result.id))
      .execute();

    expect(musicTracks).toHaveLength(1);
    const savedTrack = musicTracks[0];
    expect(savedTrack.user_id).toEqual(testUser.id);
    expect(savedTrack.title).toEqual('Database Song');
    expect(savedTrack.artist).toEqual('Database Artist');
    expect(savedTrack.album).toEqual('Database Album');
    expect(savedTrack.duration_seconds).toEqual(240);
    expect(savedTrack.genre).toEqual('Rock');
    expect(savedTrack.spotify_url).toEqual('https://open.spotify.com/track/db123');
    expect(savedTrack.is_favorite).toEqual(true);
    expect(savedTrack.added_at).toBeInstanceOf(Date);
  });

  it('should handle nullable fields correctly', async () => {
    const testUser = await createTestUser();
    
    const testInput: CreateMusicTrackInput = {
      user_id: testUser.id,
      title: 'Nullable Test Song',
      artist: 'Nullable Test Artist',
      duration_seconds: 150,
      album: null,
      genre: null,
      spotify_url: null,
      is_favorite: false
    };

    const result = await createMusicTrack(testInput);

    expect(result.album).toBeNull();
    expect(result.genre).toBeNull();
    expect(result.spotify_url).toBeNull();
    expect(result.is_favorite).toEqual(false);

    // Verify in database
    const musicTracks = await db.select()
      .from(musicTracksTable)
      .where(eq(musicTracksTable.id, result.id))
      .execute();

    const savedTrack = musicTracks[0];
    expect(savedTrack.album).toBeNull();
    expect(savedTrack.genre).toBeNull();
    expect(savedTrack.spotify_url).toBeNull();
    expect(savedTrack.is_favorite).toEqual(false);
  });

  it('should handle default values from Zod schema', async () => {
    const testUser = await createTestUser();
    
    // Test input with is_favorite defaulting to false through Zod
    const testInput: CreateMusicTrackInput = {
      user_id: testUser.id,
      title: 'Default Test Song',
      artist: 'Default Test Artist',
      duration_seconds: 200,
      is_favorite: false // Include is_favorite as it's required in the parsed type
    };

    const result = await createMusicTrack(testInput);

    expect(result.is_favorite).toEqual(false);
  });

  it('should throw error for non-existent user_id', async () => {
    const testInput: CreateMusicTrackInput = {
      user_id: 99999, // Non-existent user ID
      title: 'Invalid User Song',
      artist: 'Invalid User Artist',
      duration_seconds: 180,
      is_favorite: false
    };

    await expect(createMusicTrack(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should create multiple music tracks for same user', async () => {
    const testUser = await createTestUser();
    
    const firstTrack: CreateMusicTrackInput = {
      user_id: testUser.id,
      title: 'First Song',
      artist: 'Test Artist',
      duration_seconds: 180,
      is_favorite: true
    };

    const secondTrack: CreateMusicTrackInput = {
      user_id: testUser.id,
      title: 'Second Song',
      artist: 'Test Artist',
      duration_seconds: 220,
      is_favorite: false
    };

    const result1 = await createMusicTrack(firstTrack);
    const result2 = await createMusicTrack(secondTrack);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.title).toEqual('First Song');
    expect(result2.title).toEqual('Second Song');
    expect(result1.is_favorite).toEqual(true);
    expect(result2.is_favorite).toEqual(false);

    // Verify both tracks exist in database
    const allTracks = await db.select()
      .from(musicTracksTable)
      .where(eq(musicTracksTable.user_id, testUser.id))
      .execute();

    expect(allTracks).toHaveLength(2);
  });
});