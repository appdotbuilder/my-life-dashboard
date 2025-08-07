import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Cloud, CloudRain, Sun, Snowflake, Wind, Droplets, Thermometer, Plus, RefreshCw } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Weather, CreateWeatherInput } from '../../../server/src/schema';

interface WeatherCardProps {
  weather: Weather | null;
  userId: number;
  onWeatherUpdate: () => void;
  expanded?: boolean;
}

export function WeatherCard({ weather, userId, onWeatherUpdate, expanded = false }: WeatherCardProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<CreateWeatherInput, 'user_id'>>({
    location: '',
    temperature: 20,
    condition: '',
    humidity: 50,
    wind_speed: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await trpc.createWeatherRecord.mutate({
        user_id: userId,
        location: formData.location,
        temperature: formData.temperature,
        condition: formData.condition,
        humidity: formData.humidity,
        wind_speed: formData.wind_speed
      });
      
      setIsAddDialogOpen(false);
      setFormData({
        location: '',
        temperature: 20,
        condition: '',
        humidity: 50,
        wind_speed: 0
      });
      onWeatherUpdate(); // Refresh the dashboard data
    } catch (error) {
      console.error('Failed to add weather record:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('rain') || lowerCondition.includes('storm')) {
      return <CloudRain className="h-8 w-8 text-blue-500" />;
    } else if (lowerCondition.includes('snow')) {
      return <Snowflake className="h-8 w-8 text-blue-300" />;
    } else if (lowerCondition.includes('cloud') || lowerCondition.includes('overcast')) {
      return <Cloud className="h-8 w-8 text-gray-500" />;
    } else {
      return <Sun className="h-8 w-8 text-yellow-500" />;
    }
  };

  const refreshWeather = async () => {
    setIsLoading(true);
    try {
      await trpc.getCurrentWeather.query({ user_id: userId });
      onWeatherUpdate();
    } catch (error) {
      console.error('Failed to refresh weather:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={expanded ? 'lg:col-span-1' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Cloud className="h-5 w-5 text-green-600" />
            Weather
          </CardTitle>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refreshWeather}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>
        <CardDescription>Current weather conditions</CardDescription>
      </CardHeader>
      <CardContent>
        {weather ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {getWeatherIcon(weather.condition)}
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {Math.round(weather.temperature)}°C
                  </span>
                  <span className="text-lg text-gray-600 capitalize">
                    {weather.condition}
                  </span>
                </div>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Thermometer className="h-4 w-4" />
                  {weather.location}
                </p>
              </div>
            </div>
            
            {expanded && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Humidity</p>
                    <p className="font-semibold">{weather.humidity}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Wind Speed</p>
                    <p className="font-semibold">{weather.wind_speed} km/h</p>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-400 pt-2 border-t">
              Last updated: {weather.recorded_at.toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No weather data available</p>
            <p className="text-sm mb-4">Add a weather record to see current conditions</p>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Weather Data
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        )}
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Weather Record</DialogTitle>
              <DialogDescription>
                Record current weather conditions for your location.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: Omit<CreateWeatherInput, 'user_id'>) => ({ ...prev, location: e.target.value }))
                  }
                  placeholder="e.g., New York, NY"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    value={formData.temperature}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: Omit<CreateWeatherInput, 'user_id'>) => ({ 
                        ...prev, 
                        temperature: parseFloat(e.target.value) || 0 
                      }))
                    }
                    step="0.1"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="humidity">Humidity (%)</Label>
                  <Input
                    id="humidity"
                    type="number"
                    value={formData.humidity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: Omit<CreateWeatherInput, 'user_id'>) => ({ 
                        ...prev, 
                        humidity: parseInt(e.target.value) || 0 
                      }))
                    }
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="condition">Weather Condition</Label>
                <Input
                  id="condition"
                  value={formData.condition}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: Omit<CreateWeatherInput, 'user_id'>) => ({ ...prev, condition: e.target.value }))
                  }
                  placeholder="e.g., Sunny, Cloudy, Rainy"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="wind_speed">Wind Speed (km/h)</Label>
                <Input
                  id="wind_speed"
                  type="number"
                  value={formData.wind_speed}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: Omit<CreateWeatherInput, 'user_id'>) => ({ 
                      ...prev, 
                      wind_speed: parseFloat(e.target.value) || 0 
                    }))
                  }
                  min="0"
                  step="0.1"
                  required
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
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Adding...' : 'Add Weather'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}