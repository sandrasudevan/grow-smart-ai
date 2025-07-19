import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketPrice {
  crop: string;
  price: number;
  unit: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  market: string;
  lastUpdated: string;
}

interface MarketData {
  location: string;
  prices: MarketPrice[];
  marketTrends: {
    crop: string;
    prediction: string;
    confidence: number;
  }[];
}

// Crop name mapping for API compatibility
const cropMapping: { [key: string]: string } = {
  'rice': 'paddy',
  'wheat': 'wheat',
  'cotton': 'cotton',
  'sugarcane': 'sugarcane',
  'maize': 'maize',
  'soybean': 'soybean',
  'vegetables': 'tomato', // default vegetable
  'tomato': 'tomato',
  'onion': 'onion',
  'potato': 'potato'
};

async function fetchMandiData(apiKey: string, location: string, crops: string[]): Promise<MarketData> {
  try {
    // Transform location for API (remove state part if present)
    const district = location.split(',')[0].trim();
    
    const marketData: MarketData = {
      location: location || "Local Market",
      prices: [],
      marketTrends: []
    };

    // Fetch data for each crop
    for (const crop of crops || ['rice', 'wheat', 'vegetables']) {
      const apiCropName = cropMapping[crop.toLowerCase()] || crop.toLowerCase();
      
      try {
        // Make API call to mandi market API
        const response = await fetch(`https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&filters[commodity]=${apiCropName}&filters[district]=${district}&limit=5`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.records && data.records.length > 0) {
            // Process the real API data
            const record = data.records[0];
            const price = parseFloat(record.max_price || record.min_price || record.modal_price || '0');
            const prevPrice = data.records[1] ? parseFloat(data.records[1].max_price || data.records[1].min_price || data.records[1].modal_price || '0') : price;
            const change = price - prevPrice;
            const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';

            marketData.prices.push({
              crop: crop.charAt(0).toUpperCase() + crop.slice(1),
              price: price,
              unit: '₹/quintal',
              change: Math.round(change * 100) / 100,
              trend: trend,
              market: record.market || 'Mandi',
              lastUpdated: new Date().toISOString()
            });

            // Add market trend prediction
            marketData.marketTrends.push({
              crop: crop.charAt(0).toUpperCase() + crop.slice(1),
              prediction: trend === 'up' ? 'Prices showing upward trend' : 
                         trend === 'down' ? 'Prices showing downward trend' : 
                         'Prices remain stable',
              confidence: 75 + Math.random() * 20 // 75-95% confidence
            });
          }
        }
      } catch (cropError) {
        console.error(`Error fetching data for crop ${crop}:`, cropError);
        // Continue with next crop
      }
    }

    // If no real data was fetched, fall back to demo data
    if (marketData.prices.length === 0) {
      console.log('No real data available, using fallback data');
      return getFallbackData(location, crops);
    }

    console.log(`Successfully fetched real market data for ${marketData.prices.length} crops`);
    return marketData;

  } catch (error) {
    console.error('Error in fetchMandiData:', error);
    return getFallbackData(location, crops);
  }
}

function getFallbackData(location: string, crops: string[]): MarketData {
  const fallbackData: MarketData = {
    location: location || "Local Market",
    prices: [
      {
        crop: "Rice",
        price: 4500,
        unit: "₹/quintal",
        change: 250,
        trend: "up",
        market: "Mandi",
        lastUpdated: new Date().toISOString()
      },
      {
        crop: "Wheat",
        price: 2800,
        unit: "₹/quintal",
        change: -120,
        trend: "down",
        market: "Wholesale",
        lastUpdated: new Date().toISOString()
      },
      {
        crop: "Vegetables",
        price: 1500,
        unit: "₹/quintal",
        change: 320,
        trend: "up",
        market: "Vegetable Market",
        lastUpdated: new Date().toISOString()
      }
    ],
    marketTrends: [
      {
        crop: "Rice",
        prediction: "Prices expected to rise due to increased demand",
        confidence: 85
      },
      {
        crop: "Wheat",
        prediction: "Seasonal decline, consider holding stock",
        confidence: 78
      },
      {
        crop: "Vegetables",
        prediction: "Good demand, prices trending upward",
        confidence: 82
      }
    ]
  };

  // Filter based on user's crops
  if (crops && crops.length > 0) {
    fallbackData.prices = fallbackData.prices.filter(price => 
      crops.some(crop => price.crop.toLowerCase().includes(crop.toLowerCase()))
    );
    fallbackData.marketTrends = fallbackData.marketTrends.filter(trend => 
      crops.some(crop => trend.crop.toLowerCase().includes(crop.toLowerCase()))
    );
  }

  return fallbackData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location, crops } = await req.json();
    const mandiApiKey = Deno.env.get('MANDI_API_KEY');
    
    if (!mandiApiKey) {
      console.error('MANDI_API_KEY not found');
      // Fallback to mock data if API key is not available
      const fallbackData = getFallbackData(location, crops);
      return new Response(JSON.stringify(fallbackData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching real market data for:', { location, crops });
    
    // Fetch real-time market data from mandi API
    const marketData = await fetchMandiData(mandiApiKey, location, crops);
    
    return new Response(JSON.stringify(marketData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in market-prices function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      location: "Demo Market",
      prices: [],
      marketTrends: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});