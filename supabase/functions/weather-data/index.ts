import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  condition: string;
  windSpeed: number;
  pressure: number;
  rainfall: number;
  forecast: {
    day: string;
    high: number;
    low: number;
    condition: string;
    rainfall: number;
  }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, location } = await req.json();
    
    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }

    const apiKey = Deno.env.get('OPENWEATHER_API_KEY');
    
    if (!apiKey) {
      // Return mock data if no API key is configured
      const mockWeatherData: WeatherData = {
        location: location || "Your Location",
        temperature: 28,
        humidity: 65,
        condition: "Partly Cloudy",
        windSpeed: 12,
        pressure: 1013,
        rainfall: 0,
        forecast: [
          { day: "Today", high: 32, low: 22, condition: "Sunny", rainfall: 0 },
          { day: "Tomorrow", high: 30, low: 20, condition: "Partly Cloudy", rainfall: 5 },
          { day: "Day 3", high: 28, low: 18, condition: "Light Rain", rainfall: 15 },
          { day: "Day 4", high: 29, low: 19, condition: "Cloudy", rainfall: 10 },
          { day: "Day 5", high: 31, low: 21, condition: "Sunny", rainfall: 0 },
        ]
      };

      return new Response(JSON.stringify(mockWeatherData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Current weather
    const currentResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
    );
    
    // 5-day forecast
    const forecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
    );

    if (!currentResponse.ok || !forecastResponse.ok) {
      throw new Error('Failed to fetch weather data');
    }

    const currentData = await currentResponse.json();
    const forecastData = await forecastResponse.json();

    // Process forecast data (get daily forecasts)
    const dailyForecasts = forecastData.list
      .filter((_: any, index: number) => index % 8 === 0) // Every 24 hours
      .slice(0, 5)
      .map((item: any, index: number) => ({
        day: index === 0 ? "Today" : index === 1 ? "Tomorrow" : `Day ${index + 1}`,
        high: Math.round(item.main.temp_max),
        low: Math.round(item.main.temp_min),
        condition: item.weather[0].main,
        rainfall: item.rain?.['3h'] || 0
      }));

    const weatherData: WeatherData = {
      location: currentData.name,
      temperature: Math.round(currentData.main.temp),
      humidity: currentData.main.humidity,
      condition: currentData.weather[0].main,
      windSpeed: Math.round(currentData.wind.speed * 3.6), // m/s to km/h
      pressure: currentData.main.pressure,
      rainfall: currentData.rain?.['1h'] || 0,
      forecast: dailyForecasts
    };

    return new Response(JSON.stringify(weatherData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in weather-data function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      // Fallback mock data
      location: "Demo Location",
      temperature: 25,
      humidity: 60,
      condition: "Clear",
      windSpeed: 10,
      pressure: 1015,
      rainfall: 0,
      forecast: [
        { day: "Today", high: 28, low: 18, condition: "Clear", rainfall: 0 }
      ]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});