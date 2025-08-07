import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CalendarDays, Plus, Edit, Trash2, MapPin, Clock, Calendar } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { CalendarEvent, CreateCalendarEventInput, UpdateCalendarEventInput } from '../../../server/src/schema';

interface CalendarSectionProps {
  userId: number;
  onEventChange: () => void;
}

export function CalendarSection({ userId, onEventChange }: CalendarSectionProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [addFormData, setAddFormData] = useState<Omit<CreateCalendarEventInput, 'user_id'>>({
    title: '',
    description: null,
    start_time: new Date(),
    end_time: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    location: null,
    is_all_day: false
  });

  const [editFormData, setEditFormData] = useState<Omit<UpdateCalendarEventInput, 'id'>>({
    title: '',
    description: null,
    start_time: new Date(),
    end_time: new Date(),
    location: null,
    is_all_day: false
  });

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      // STUB NOTICE: The backend getUserEvents handler returns empty array
      const result = await trpc.getUserEvents.query({ user_id: userId });
      setEvents(result);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const newEvent = await trpc.createCalendarEvent.mutate({
        user_id: userId,
        title: addFormData.title,
        description: addFormData.description || null,
        start_time: addFormData.start_time,
        end_time: addFormData.end_time,
        location: addFormData.location || null,
        is_all_day: addFormData.is_all_day
      });
      
      setEvents((prev: CalendarEvent[]) => [...prev, newEvent]);
      setIsAddDialogOpen(false);
      resetAddForm();
      onEventChange();
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    
    setIsSubmitting(true);
    
    try {
      const updatedEvent = await trpc.updateCalendarEvent.mutate({
        id: editingEvent.id,
        title: editFormData.title,
        description: editFormData.description,
        start_time: editFormData.start_time,
        end_time: editFormData.end_time,
        location: editFormData.location,
        is_all_day: editFormData.is_all_day
      });
      
      setEvents((prev: CalendarEvent[]) => 
        prev.map((event: CalendarEvent) => event.id === editingEvent.id ? updatedEvent : event)
      );
      setIsEditDialogOpen(false);
      setEditingEvent(null);
      onEventChange();
    } catch (error) {
      console.error('Failed to update event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    try {
      await trpc.deleteCalendarEvent.mutate({ eventId });
      setEvents((prev: CalendarEvent[]) => prev.filter((event: CalendarEvent) => event.id !== eventId));
      onEventChange();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const resetAddForm = () => {
    setAddFormData({
      title: '',
      description: null,
      start_time: new Date(),
      end_time: new Date(Date.now() + 60 * 60 * 1000),
      location: null,
      is_all_day: false
    });
  };

  const openEditDialog = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEditFormData({
      title: event.title,
      description: event.description,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
      is_all_day: event.is_all_day
    });
    setIsEditDialogOpen(true);
  };

  const formatDateTime = (date: Date) => {
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  };

  const parseDateTime = (dateString: string) => {
    return new Date(dateString);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                <CalendarDays className="h-5 w-5 text-blue-600" />
                Calendar Events
              </CardTitle>
              <CardDescription>Manage your upcoming events and appointments</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetAddForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CalendarDays className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No events scheduled</p>
              <p className="text-sm mb-6">Create your first event to get started with organizing your schedule</p>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetAddForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Event
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event: CalendarEvent) => (
                <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{event.title}</h3>
                        {event.is_all_day && (
                          <Badge variant="secondary" className="text-xs">All Day</Badge>
                        )}
                      </div>
                      
                      {event.description && (
                        <p className="text-gray-600 text-sm mb-3">{event.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {event.start_time.toLocaleDateString()}
                            {!event.is_all_day && ` at ${event.start_time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                          </span>
                        </div>
                        
                        {!event.is_all_day && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              Until {event.end_time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        )}
                        
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openEditDialog(event)}
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
                            <AlertDialogTitle>Delete Event</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{event.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteEvent(event.id)}
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
          )}
        </CardContent>
      </Card>

      {/* Add Event Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Calendar Event</DialogTitle>
            <DialogDescription>
              Create a new event for your calendar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-title">Event Title</Label>
              <Input
                id="add-title"
                value={addFormData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAddFormData((prev: Omit<CreateCalendarEventInput, 'user_id'>) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Meeting with team"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="add-description">Description (optional)</Label>
              <Textarea
                id="add-description"
                value={addFormData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setAddFormData((prev: Omit<CreateCalendarEventInput, 'user_id'>) => ({ 
                    ...prev, 
                    description: e.target.value || null 
                  }))
                }
                placeholder="Event details..."
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="add-all-day"
                checked={addFormData.is_all_day}
                onCheckedChange={(checked: boolean) =>
                  setAddFormData((prev: Omit<CreateCalendarEventInput, 'user_id'>) => ({ ...prev, is_all_day: checked }))
                }
              />
              <Label htmlFor="add-all-day">All day event</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-start">Start {addFormData.is_all_day ? 'Date' : 'Time'}</Label>
                <Input
                  id="add-start"
                  type={addFormData.is_all_day ? 'date' : 'datetime-local'}
                  value={addFormData.is_all_day ? 
                    addFormData.start_time.toISOString().split('T')[0] : 
                    formatDateTime(addFormData.start_time)
                  }
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAddFormData((prev: Omit<CreateCalendarEventInput, 'user_id'>) => ({ 
                      ...prev, 
                      start_time: parseDateTime(e.target.value) 
                    }))
                  }
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add-end">End {addFormData.is_all_day ? 'Date' : 'Time'}</Label>
                <Input
                  id="add-end"
                  type={addFormData.is_all_day ? 'date' : 'datetime-local'}
                  value={addFormData.is_all_day ? 
                    addFormData.end_time.toISOString().split('T')[0] : 
                    formatDateTime(addFormData.end_time)
                  }
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAddFormData((prev: Omit<CreateCalendarEventInput, 'user_id'>) => ({ 
                      ...prev, 
                      end_time: parseDateTime(e.target.value) 
                    }))
                  }
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="add-location">Location (optional)</Label>
              <Input
                id="add-location"
                value={addFormData.location || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAddFormData((prev: Omit<CreateCalendarEventInput, 'user_id'>) => ({ 
                    ...prev, 
                    location: e.target.value || null 
                  }))
                }
                placeholder="Meeting room, address, or virtual link"
              />
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
                {isSubmitting ? 'Creating...' : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update the event details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Event Title</Label>
              <Input
                id="edit-title"
                value={editFormData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditFormData((prev: Omit<UpdateCalendarEventInput, 'id'>) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditFormData((prev: Omit<UpdateCalendarEventInput, 'id'>) => ({ 
                    ...prev, 
                    description: e.target.value || null 
                  }))
                }
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-all-day"
                checked={editFormData.is_all_day}
                onCheckedChange={(checked: boolean) =>
                  setEditFormData((prev: Omit<UpdateCalendarEventInput, 'id'>) => ({ ...prev, is_all_day: checked }))
                }
              />
              <Label htmlFor="edit-all-day">All day event</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start">Start Time</Label>
                <Input
                  id="edit-start"
                  type={editFormData.is_all_day ? 'date' : 'datetime-local'}
                  value={editFormData.is_all_day ? 
                    (editFormData.start_time as Date).toISOString().split('T')[0] : 
                    formatDateTime(editFormData.start_time as Date)
                  }
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: Omit<UpdateCalendarEventInput, 'id'>) => ({ 
                      ...prev, 
                      start_time: parseDateTime(e.target.value) 
                    }))
                  }
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-end">End Time</Label>
                <Input
                  id="edit-end"
                  type={editFormData.is_all_day ? 'date' : 'datetime-local'}
                  value={editFormData.is_all_day ? 
                    (editFormData.end_time as Date).toISOString().split('T')[0] : 
                    formatDateTime(editFormData.end_time as Date)
                  }
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: Omit<UpdateCalendarEventInput, 'id'>) => ({ 
                      ...prev, 
                      end_time: parseDateTime(e.target.value) 
                    }))
                  }
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={editFormData.location || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditFormData((prev: Omit<UpdateCalendarEventInput, 'id'>) => ({ 
                    ...prev, 
                    location: e.target.value || null 
                  }))
                }
              />
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
                {isSubmitting ? 'Updating...' : 'Update Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}