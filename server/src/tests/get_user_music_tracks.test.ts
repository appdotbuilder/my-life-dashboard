import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, musicTracksTable } from '../db/schema';
import { type GetUserMusicTracksInput } from '../schema';
import { getUserMusicTracks } from '../handlers/get_user_music_tracks';

describe('getUserMusicTracks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all music tracks for a user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'user@test.com',
        location: 'Test City'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create test music tracks
    await db.insert(musicTracksTable)
      .values([
        {
          user_id: user.id,
          title: 'Track 1',
          artist: 'Artist 1',
          album: 'Album 1',
          duration_seconds: 240,
          genre: 'Rock',
          spotify_url: 'https://spotify.com/track1',
          is_favorite: true
        },
        {
          user_id: user.id,
          title: 'Track 2',
          artist: 'Artist 2',
          album: 'Album 2',
          duration_seconds: 180,
          genre: 'Pop',
          spotify_url: 'https://spotify.com/track2',
          is_favorite: false
        }
      ])
      .execute();

    const input: GetUserMusicTracksInput = {
      user_id: user.id
    };

    const result = await getUserMusicTracks(input);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBeDefined();
    expect(result[0].artist).toBeDefined();
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].id).toBeDefined();
    expect(result[0].added_at).toBeInstanceOf(Date);
    expect(typeof result[0].duration_seconds).toBe('number');
    expect(typeof result[0].is_favorite).toBe('boolean');
  });

  it('should return only favorite tracks when favorites_only is true', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'user@test.com',
        location: 'Test City'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create mix of favorite and non-favorite tracks
    await db.insert(musicTracksTable)
      .values([
        {
          user_id: user.id,
          title: 'Favorite Track 1',
          artist: 'Favorite Artist 1',
          album: 'Favorite Album 1',
          duration_seconds: 240,
          genre: 'Rock',
          spotify_url: 'https://spotify.com/track1',
          is_favorite: true
        },
        {
          user_id: user.id,
          title: 'Regular Track',
          artist: 'Regular Artist',
          album: 'Regular Album',
          duration_seconds: 180,
          genre: 'Pop',
          spotify_url: 'https://spotify.com/track2',
          is_favorite: false
        },
        {
          user_id: user.id,
          title: 'Favorite Track 2',
          artist: 'Favorite Artist 2',
          album: 'Favorite Album 2',
          duration_seconds: 300,
          genre: 'Jazz',
          spotify_url: 'https://spotify.com/track3',
          is_favorite: true
        }
      ])
      .execute();

    const input: GetUserMusicTracksInput = {
      user_id: user.id,
      favorites_only: true
    };

    const result = await getUserMusicTracks(input);

    expect(result).toHaveLength(2);
    result.forEach(track => {
      expect(track.is_favorite).toBe(true);
      expect(track.user_id).toEqual(user.id);
    });

    // Verify we got the expected favorite tracks
    const trackTitles = result.map(t => t.title).sort();
    expect(trackTitles).toEqual(['Favorite Track 1', 'Favorite Track 2']);
  });

  it('should return all tracks when favorites_only is false', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'user@test.com',
        location: 'Test City'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create mix of favorite and non-favorite tracks
    await db.insert(musicTracksTable)
      .values([
        {
          user_id: user.id,
          title: 'Favorite Track',
          artist: 'Favorite Artist',
          album: 'Favorite Album',
          duration_seconds: 240,
          genre: 'Rock',
          spotify_url: 'https://spotify.com/track1',
          is_favorite: true
        },
        {
          user_id: user.id,
          title: 'Regular Track',
          artist: 'Regular Artist',
          album: 'Regular Album',
          duration_seconds: 180,
          genre: 'Pop',
          spotify_url: 'https://spotify.com/track2',
          is_favorite: false
        }
      ])
      .execute();

    const input: GetUserMusicTracksInput = {
      user_id: user.id,
      favorites_only: false
    };

    const result = await getUserMusicTracks(input);

    expect(result).toHaveLength(2);
    
    // Should include both favorite and non-favorite tracks
    const favoriteStatuses = result.map(t => t.is_favorite).sort();
    expect(favoriteStatuses).toEqual([false, true]);
  });

  it('should return empty array for user with no tracks', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'user@test.com',
        location: 'Test City'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const input: GetUserMusicTracksInput = {
      user_id: user.id
    };

    const result = await getUserMusicTracks(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array when user only has non-favorites but favorites_only is true', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'user@test.com',
        location: 'Test City'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create only non-favorite tracks
    await db.insert(musicTracksTable)
      .values([
        {
          user_id: user.id,
          title: 'Regular Track 1',
          artist: 'Regular Artist 1',
          album: 'Regular Album 1',
          duration_seconds: 240,
          genre: 'Rock',
          spotify_url: 'https://spotify.com/track1',
          is_favorite: false
        },
        {
          user_id: user.id,
          title: 'Regular Track 2',
          artist: 'Regular Artist 2',
          album: 'Regular Album 2',
          duration_seconds: 180,
          genre: 'Pop',
          spotify_url: 'https://spotify.com/track2',
          is_favorite: false
        }
      ])
      .execute();

    const input: GetUserMusicTracksInput = {
      user_id: user.id,
      favorites_only: true
    };

    const result = await getUserMusicTracks(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return tracks for the specified user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        name: 'User 1',
        email: 'user1@test.com',
        location: 'Test City 1'
      })
      .returning()
      .execute();
    const user1 = user1Result[0];

    const user2Result = await db.insert(usersTable)
      .values({
        name: 'User 2',
        email: 'user2@test.com',
        location: 'Test City 2'
      })
      .returning()
      .execute();
    const user2 = user2Result[0];

    // Create tracks for both users
    await db.insert(musicTracksTable)
      .values([
        {
          user_id: user1.id,
          title: 'User 1 Track',
          artist: 'User 1 Artist',
          album: 'User 1 Album',
          duration_seconds: 240,
          genre: 'Rock',
          spotify_url: 'https://spotify.com/track1',
          is_favorite: true
        },
        {
          user_id: user2.id,
          title: 'User 2 Track',
          artist: 'User 2 Artist',
          album: 'User 2 Album',
          duration_seconds: 180,
          genre: 'Pop',
          spotify_url: 'https://spotify.com/track2',
          is_favorite: true
        }
      ])
      .execute();

    const input: GetUserMusicTracksInput = {
      user_id: user1.id
    };

    const result = await getUserMusicTracks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('User 1 Track');
    expect(result[0].user_id).toEqual(user1.id);
  });

  it('should handle tracks with nullable fields correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'user@test.com',
        location: 'Test City'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create track with nullable fields set to null
    await db.insert(musicTracksTable)
      .values({
        user_id: user.id,
        title: 'Minimal Track',
        artist: 'Minimal Artist',
        album: null, // nullable field
        duration_seconds: 240,
        genre: null, // nullable field
        spotify_url: null, // nullable field
        is_favorite: false
      })
      .execute();

    const input: GetUserMusicTracksInput = {
      user_id: user.id
    };

    const result = await getUserMusicTracks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Minimal Track');
    expect(result[0].artist).toEqual('Minimal Artist');
    expect(result[0].album).toBeNull();
    expect(result[0].genre).toBeNull();
    expect(result[0].spotify_url).toBeNull();
    expect(result[0].is_favorite).toBe(false);
    expect(typeof result[0].duration_seconds).toBe('number');
  });

  it('should return tracks ordered by most recently added first', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'user@test.com',
        location: 'Test City'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create tracks at different times
    const track1Result = await db.insert(musicTracksTable)
      .values({
        user_id: user.id,
        title: 'Older Track',
        artist: 'Older Artist',
        album: 'Older Album',
        duration_seconds: 240,
        genre: 'Rock',
        spotify_url: 'https://spotify.com/track1',
        is_favorite: false
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const track2Result = await db.insert(musicTracksTable)
      .values({
        user_id: user.id,
        title: 'Newer Track',
        artist: 'Newer Artist',
        album: 'Newer Album',
        duration_seconds: 180,
        genre: 'Pop',
        spotify_url: 'https://spotify.com/track2',
        is_favorite: true
      })
      .returning()
      .execute();

    const input: GetUserMusicTracksInput = {
      user_id: user.id
    };

    const result = await getUserMusicTracks(input);

    expect(result).toHaveLength(2);
    // Newer track should be first (ordered by added_at DESC)
    expect(result[0].title).toEqual('Newer Track');
    expect(result[1].title).toEqual('Older Track');
    expect(result[0].added_at.getTime()).toBeGreaterThan(result[1].added_at.getTime());
  });
});