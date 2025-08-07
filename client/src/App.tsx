import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, MapPin, Cloud, Music, Plus, User as UserIcon, Settings } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, CalendarEvent, Weather, MusicTrack } from '../../server/src/schema';
import type { DashboardData } from '../../server/src/handlers/get_dashboard_data';
import { UserProfileCard } from '@/components/UserProfileCard';
import { CalendarSection } from '@/components/CalendarSection';
import { WeatherCard } from '@/components/WeatherCard';
import { MusicSection } from '@/components/MusicSection';

function App() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // For demo purposes, using a fixed user ID - in a real app this would come from authentication
  const currentUserId = 1;

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // STUB NOTICE: The backend getDashboardData handler uses placeholder data
      const data = await trpc.getDashboardData.query({ userId: currentUserId });
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const refreshDashboard = () => {
    loadDashboardData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading your personal dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={refreshDashboard}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <p className="text-gray-600">No dashboard data available.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <UserIcon className="h-8 w-8 text-blue-600" />
              Personal Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Welcome back, {dashboardData.user.name}! ✨</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={refreshDashboard} variant="outline" size="sm">
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-100 to-blue-200 border-blue-200">
            <CardContent className="p-4 flex items-center">
              <CalendarDays className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-blue-700 font-medium">Upcoming Events</p>
                <p className="text-2xl font-bold text-blue-900">{dashboardData.upcomingEvents.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-100 to-green-200 border-green-200">
            <CardContent className="p-4 flex items-center">
              <Cloud className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-green-700 font-medium">Weather</p>
                <p className="text-2xl font-bold text-green-900">
                  {dashboardData.currentWeather?.temperature ? `${Math.round(dashboardData.currentWeather.temperature)}°` : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-100 to-purple-200 border-purple-200">
            <CardContent className="p-4 flex items-center">
              <Music className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-purple-700 font-medium">Favorite Tracks</p>
                <p className="text-2xl font-bold text-purple-900">{dashboardData.favoriteTracks.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-100 to-orange-200 border-orange-200">
            <CardContent className="p-4 flex items-center">
              <MapPin className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm text-orange-700 font-medium">Location</p>
                <p className="text-lg font-bold text-orange-900">
                  {dashboardData.user.location || 'Not set'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="weather">Weather</TabsTrigger>
            <TabsTrigger value="music">Music</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* User Profile */}
              <UserProfileCard user={dashboardData.user} onUpdate={refreshDashboard} />
              
              {/* Weather */}
              <WeatherCard 
                weather={dashboardData.currentWeather} 
                userId={currentUserId}
                onWeatherUpdate={refreshDashboard}
              />

              {/* Recent Events Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-blue-600" />
                    Upcoming Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData.upcomingEvents.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No upcoming events</p>
                      <p className="text-sm">Events will appear here when added</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dashboardData.upcomingEvents.slice(0, 3).map((event: CalendarEvent) => (
                        <div key={event.id} className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{event.title}</p>
                            <p className="text-xs text-gray-600">
                              {event.start_time.toLocaleDateString()} at {event.start_time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                          </div>
                        </div>
                      ))}
                      {dashboardData.upcomingEvents.length > 3 && (
                        <p className="text-sm text-blue-600 text-center">
                          +{dashboardData.upcomingEvents.length - 3} more events
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Favorite Music Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5 text-purple-600" />
                  Favorite Music
                </CardTitle>
                <CardDescription>Your recently added favorite tracks</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.favoriteTracks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No favorite tracks yet</p>
                    <p className="text-sm">Add some music to see your favorites here</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dashboardData.favoriteTracks.slice(0, 6).map((track: MusicTrack) => (
                      <div key={track.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Music className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{track.title}</p>
                          <p className="text-xs text-gray-600 truncate">{track.artist}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarSection userId={currentUserId} onEventChange={refreshDashboard} />
          </TabsContent>

          <TabsContent value="weather">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WeatherCard 
                weather={dashboardData.currentWeather} 
                userId={currentUserId}
                onWeatherUpdate={refreshDashboard}
                expanded={true}
              />
              
              {/* Weather History placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle>Weather History</CardTitle>
                  <CardDescription>Recent weather records</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Weather history coming soon</p>
                    <p className="text-sm">Historical weather data will be displayed here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="music">
            <MusicSection userId={currentUserId} onMusicChange={refreshDashboard} />
          </TabsContent>
        </Tabs>

        {/* Development Notice */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-yellow-800">Development Notice</p>
                <p className="text-xs text-yellow-700 mt-1">
                  This dashboard currently uses stub data from the backend handlers. 
                  Real database integration will provide live calendar events, weather data, and music tracks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;