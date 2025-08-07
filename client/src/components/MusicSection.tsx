import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Music, Plus, Edit, Trash2, Heart, HeartOff, ExternalLink, Clock, User as UserIcon, Disc } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { MusicTrack, CreateMusicTrackInput, UpdateMusicTrackInput } from '../../../server/src/schema';

interface MusicSectionProps {
  userId: number;
  onMusicChange: () => void;
}

export function MusicSection({ userId, onMusicChange }: MusicSectionProps) {
  const [allTracks, setAllTracks] = useState<MusicTrack[]>([]);
  const [favorites, setFavorites] = useState<MusicTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<MusicTrack | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [addFormData, setAddFormData] = useState<Omit<CreateMusicTrackInput, 'user_id'>>({
    title: '',
    artist: '',
    album: null,
    duration_seconds: 0,
    genre: null,
    spotify_url: null,
    is_favorite: false
  });

  const [editFormData, setEditFormData] = useState<Omit<UpdateMusicTrackInput, 'id'>>({
    title: '',
    artist: '',
    album: null,
    duration_seconds: 0,
    genre: null,
    spotify_url: null,
    is_favorite: false
  });

  const loadTracks = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load all tracks
      const allTracksResult = await trpc.getUserMusicTracks.query({ 
        user_id: userId, 
        favorites_only: false 
      });
      
      // Load favorites
      const favoritesResult = await trpc.getUserMusicTracks.query({ 
        user_id: userId, 
        favorites_only: true 
      });
      
      setAllTracks(allTracksResult);
      setFavorites(favoritesResult);
    } catch (error) {
      console.error('Failed to load tracks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const newTrack = await trpc.createMusicTrack.mutate({
        user_id: userId,
        title: addFormData.title,
        artist: addFormData.artist,
        album: addFormData.album || null,
        duration_seconds: addFormData.duration_seconds,
        genre: addFormData.genre || null,
        spotify_url: addFormData.spotify_url || null,
        is_favorite: addFormData.is_favorite
      });
      
      setAllTracks((prev: MusicTrack[]) => [...prev, newTrack]);
      if (newTrack.is_favorite) {
        setFavorites((prev: MusicTrack[]) => [...prev, newTrack]);
      }
      
      setIsAddDialogOpen(false);
      resetAddForm();
      onMusicChange();
    } catch (error) {
      console.error('Failed to create track:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrack) return;
    
    setIsSubmitting(true);
    
    try {
      const updatedTrack = await trpc.updateMusicTrack.mutate({
        id: editingTrack.id,
        title: editFormData.title,
        artist: editFormData.artist,
        album: editFormData.album,
        duration_seconds: editFormData.duration_seconds,
        genre: editFormData.genre,
        spotify_url: editFormData.spotify_url,
        is_favorite: editFormData.is_favorite
      });
      
      setAllTracks((prev: MusicTrack[]) => 
        prev.map((track: MusicTrack) => track.id === editingTrack.id ? updatedTrack : track)
      );
      
      setFavorites((prev: MusicTrack[]) => {
        const filtered = prev.filter((track: MusicTrack) => track.id !== editingTrack.id);
        return updatedTrack.is_favorite ? [...filtered, updatedTrack] : filtered;
      });
      
      setIsEditDialogOpen(false);
      setEditingTrack(null);
      onMusicChange();
    } catch (error) {
      console.error('Failed to update track:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTrack = async (trackId: number) => {
    try {
      await trpc.deleteMusicTrack.mutate({ trackId });
      setAllTracks((prev: MusicTrack[]) => prev.filter((track: MusicTrack) => track.id !== trackId));
      setFavorites((prev: MusicTrack[]) => prev.filter((track: MusicTrack) => track.id !== trackId));
      onMusicChange();
    } catch (error) {
      console.error('Failed to delete track:', error);
    }
  };

  const toggleFavorite = async (track: MusicTrack) => {
    try {
      const updatedTrack = await trpc.updateMusicTrack.mutate({
        id: track.id,
        is_favorite: !track.is_favorite
      });
      
      setAllTracks((prev: MusicTrack[]) => 
        prev.map((t: MusicTrack) => t.id === track.id ? updatedTrack : t)
      );
      
      if (updatedTrack.is_favorite) {
        setFavorites((prev: MusicTrack[]) => [...prev, updatedTrack]);
      } else {
        setFavorites((prev: MusicTrack[]) => prev.filter((t: MusicTrack) => t.id !== track.id));
      }
      
      onMusicChange();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const resetAddForm = () => {
    setAddFormData({
      title: '',
      artist: '',
      album: null,
      duration_seconds: 0,
      genre: null,
      spotify_url: null,
      is_favorite: false
    });
  };

  const openEditDialog = (track: MusicTrack) => {
    setEditingTrack(track);
    setEditFormData({
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration_seconds: track.duration_seconds,
      genre: track.genre,
      spotify_url: track.spotify_url,
      is_favorite: track.is_favorite
    });
    setIsEditDialogOpen(true);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const parseDuration = (durationString: string) => {
    const [minutes, seconds] = durationString.split(':').map(Number);
    return (minutes || 0) * 60 + (seconds || 0);
  };

  const formatDurationInput = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderTrackList = (tracks: MusicTrack[], showFavoriteButton = true) => {
    if (tracks.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Music className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No tracks found</p>
          <p className="text-sm mb-6">Add some music to build your library</p>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetAddForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Track
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {tracks.map((track: MusicTrack) => (
          <div key={track.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Music className="h-6 w-6 text-purple-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{track.title}</h3>
                    {track.is_favorite && (
                      <Heart className="h-4 w-4 text-red-500 fill-current" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-4 w-4" />
                      <span>{track.artist}</span>
                    </div>
                    
                    {track.album && (
                      <div className="flex items-center gap-1">
                        <Disc className="h-4 w-4" />
                        <span className="truncate">{track.album}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatDuration(track.duration_seconds)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {track.genre && (
                      <Badge variant="secondary" className="text-xs">
                        {track.genre}
                      </Badge>
                    )}
                    
                    {track.spotify_url && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        asChild
                        className="h-6 px-2 text-xs"
                      >
                        <a 
                          href={track.spotify_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Spotify
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                {showFavoriteButton && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleFavorite(track)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    {track.is_favorite ? (
                      <Heart className="h-4 w-4 fill-current text-red-500" />
                    ) : (
                      <HeartOff className="h-4 w-4" />
                    )}
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => openEditDialog(track)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Track</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{track.title}" by {track.artist}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteTrack(track.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5 text-purple-600" />
                Music Library
              </CardTitle>
              <CardDescription>Manage your favorite tracks and discover new music</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetAddForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Track
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All Tracks ({allTracks.length})</TabsTrigger>
              <TabsTrigger value="favorites">Favorites ({favorites.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              {renderTrackList(allTracks)}
            </TabsContent>
            
            <TabsContent value="favorites" className="mt-6">
              {renderTrackList(favorites, false)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Track Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Music Track</DialogTitle>
            <DialogDescription>
              Add a new track to your music library.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-title">Track Title</Label>
                <Input
                  id="add-title"
                  value={addFormData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAddFormData((prev: Omit<CreateMusicTrackInput, 'user_id'>) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Song title"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add-artist">Artist</Label>
                <Input
                  id="add-artist"
                  value={addFormData.artist}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAddFormData((prev: Omit<CreateMusicTrackInput, 'user_id'>) => ({ ...prev, artist: e.target.value }))
                  }
                  placeholder="Artist name"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-album">Album (optional)</Label>
                <Input
                  id="add-album"
                  value={addFormData.album || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAddFormData((prev: Omit<CreateMusicTrackInput, 'user_id'>) => ({ 
                      ...prev, 
                      album: e.target.value || null 
                    }))
                  }
                  placeholder="Album name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add-genre">Genre (optional)</Label>
                <Input
                  id="add-genre"
                  value={addFormData.genre || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAddFormData((prev: Omit<CreateMusicTrackInput, 'user_id'>) => ({ 
                      ...prev, 
                      genre: e.target.value || null 
                    }))
                  }
                  placeholder="Rock, Pop, Jazz..."
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="add-duration">Duration (MM:SS)</Label>
              <Input
                id="add-duration"
                value={formatDurationInput(addFormData.duration_seconds)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAddFormData((prev: Omit<CreateMusicTrackInput, 'user_id'>) => ({ 
                    ...prev, 
                    duration_seconds: parseDuration(e.target.value) 
                  }))
                }
                placeholder="3:45"
                pattern="[0-9]+:[0-5][0-9]"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="add-spotify">Spotify URL (optional)</Label>
              <Input
                id="add-spotify"
                type="url"
                value={addFormData.spotify_url || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAddFormData((prev: Omit<CreateMusicTrackInput, 'user_id'>) => ({ 
                    ...prev, 
                    spotify_url: e.target.value || null 
                  }))
                }
                placeholder="https://open.spotify.com/track/..."
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="add-favorite"
                checked={addFormData.is_favorite}
                onCheckedChange={(checked: boolean) =>
                  setAddFormData((prev: Omit<CreateMusicTrackInput, 'user_id'>) => ({ ...prev, is_favorite: checked }))
                }
              />
              <Label htmlFor="add-favorite">Mark as favorite</Label>
            </div>
            
            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Track'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Track Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Track</DialogTitle>
            <DialogDescription>
              Update the track information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Track Title</Label>
                <Input
                  id="edit-title"
                  value={editFormData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: Omit<UpdateMusicTrackInput, 'id'>) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-artist">Artist</Label>
                <Input
                  id="edit-artist"
                  value={editFormData.artist}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: Omit<UpdateMusicTrackInput, 'id'>) => ({ ...prev, artist: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-album">Album</Label>
                <Input
                  id="edit-album"
                  value={editFormData.album || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: Omit<UpdateMusicTrackInput, 'id'>) => ({ 
                      ...prev, 
                      album: e.target.value || null 
                    }))
                  }
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-genre">Genre</Label>
                <Input
                  id="edit-genre"
                  value={editFormData.genre || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: Omit<UpdateMusicTrackInput, 'id'>) => ({ 
                      ...prev, 
                      genre: e.target.value || null 
                    }))
                  }
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-duration">Duration (MM:SS)</Label>
              <Input
                id="edit-duration"
                value={formatDurationInput(editFormData.duration_seconds || 0)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditFormData((prev: Omit<UpdateMusicTrackInput, 'id'>) => ({ 
                    ...prev, 
                    duration_seconds: parseDuration(e.target.value) 
                  }))
                }
                pattern="[0-9]+:[0-5][0-9]"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-spotify">Spotify URL</Label>
              <Input
                id="edit-spotify"
                type="url"
                value={editFormData.spotify_url || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditFormData((prev: Omit<UpdateMusicTrackInput, 'id'>) => ({ 
                    ...prev, 
                    spotify_url: e.target.value || null 
                  }))
                }
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-favorite"
                checked={editFormData.is_favorite}
                onCheckedChange={(checked: boolean) =>
                  setEditFormData((prev: Omit<UpdateMusicTrackInput, 'id'>) => ({ ...prev, is_favorite: checked }))
                }
              />
              <Label htmlFor="edit-favorite">Mark as favorite</Label>
            </div>
            
            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Track'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}